import https from 'https';
import fs from 'fs';
import path from 'path';

interface FirestoreConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

let cachedConfig: FirestoreConfig | null = null;

function getConfig(): FirestoreConfig {
  if (!cachedConfig) {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      cachedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
      cachedConfig = {
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
        apiKey: process.env.VITE_FIREBASE_API_KEY || '',
        firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || '(default)'
      };
    }
  }
  return cachedConfig!;
}

const CHUNK_SIZE = 600000;

function httpRequest(url: string, options: https.RequestOptions, body?: string): Promise<{ statusCode: number; data: string }> {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode || 500, data }));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout requesting ${url}`));
    });
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Fetches an image directly from the Firestore app_images collection.
 * Recombines chunks if the image is stored across multiple subcollection documents.
 */
export async function fetchImageFromFirestore(filename: string): Promise<{ buffer: Buffer; contentType: string; redirectUrl?: string } | null> {
  const config = getConfig();
  const docId = encodeURIComponent(filename);
  const docUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/app_images/${docId}?key=${config.apiKey}`;

  try {
    const res = await httpRequest(docUrl, { method: 'GET', timeout: 10000 });
    if (res.statusCode !== 200) {
      return null;
    }

    const docJson = JSON.parse(res.data);
    const fields = docJson.fields || {};
    const contentType = fields.contentType?.stringValue || 'image/jpeg';
    const storageUrl = fields.url?.stringValue;

    // If already migrated to Firebase Storage or external URL, provide redirect
    if (storageUrl && storageUrl.startsWith('http')) {
      return {
        buffer: Buffer.alloc(0),
        contentType,
        redirectUrl: storageUrl
      };
    }

    const chunksCount = parseInt(fields.chunksCount?.integerValue || '1', 10);

    if (chunksCount <= 1 && fields.data?.stringValue) {
      return {
        buffer: Buffer.from(fields.data.stringValue, 'base64'),
        contentType
      };
    }

    // Handle chunked image
    if (chunksCount > 1) {
      const chunkPromises: Promise<{ index: number; data: string }>[] = [];
      for (let i = 0; i < chunksCount; i++) {
        const chunkUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/app_images/${docId}/chunks/${i}?key=${config.apiKey}`;
        chunkPromises.push(
          httpRequest(chunkUrl, { method: 'GET', timeout: 10000 }).then(cRes => {
            if (cRes.statusCode === 200) {
              const cJson = JSON.parse(cRes.data);
              return {
                index: parseInt(cJson.fields?.index?.integerValue || String(i), 10),
                data: cJson.fields?.data?.stringValue || ''
              };
            }
            return { index: i, data: '' };
          })
        );
      }

      const chunkResults = await Promise.all(chunkPromises);
      chunkResults.sort((a, b) => a.index - b.index);
      const fullBase64 = chunkResults.map(c => c.data).join('');

      return {
        buffer: Buffer.from(fullBase64, 'base64'),
        contentType
      };
    }

    return null;
  } catch (err: any) {
    console.warn(`Could not fetch image ${filename} from Firestore:`, err.message);
    return null;
  }
}

/**
 * Saves an image to Firestore app_images collection from the server.
 */
export async function saveImageToFirestoreServer(
  filename: string,
  buffer: Buffer,
  contentType = 'image/jpeg'
): Promise<{ url: string; success: boolean }> {
  const config = getConfig();
  const docId = encodeURIComponent(filename);
  const base64 = buffer.toString('base64');

  if (base64.length <= CHUNK_SIZE) {
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/app_images/${docId}?key=${config.apiKey}`;
    const payload = JSON.stringify({
      fields: {
        name: { stringValue: filename },
        contentType: { stringValue: contentType },
        size: { integerValue: String(buffer.length) },
        chunksCount: { integerValue: '1' },
        data: { stringValue: base64 },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    });

    await httpRequest(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 15000
    }, payload);
  } else {
    // Multi-chunk document
    const chunks: string[] = [];
    for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
      chunks.push(base64.slice(i, i + CHUNK_SIZE));
    }

    // Root doc
    const rootUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/app_images/${docId}?key=${config.apiKey}`;
    const rootPayload = JSON.stringify({
      fields: {
        name: { stringValue: filename },
        contentType: { stringValue: contentType },
        size: { integerValue: String(buffer.length) },
        chunksCount: { integerValue: String(chunks.length) },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    });

    await httpRequest(rootUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(rootPayload)
      },
      timeout: 15000
    }, rootPayload);

    // Chunks
    for (let i = 0; i < chunks.length; i++) {
      const chunkUrl = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/app_images/${docId}/chunks/${i}?key=${config.apiKey}`;
      const chunkPayload = JSON.stringify({
        fields: {
          index: { integerValue: String(i) },
          data: { stringValue: chunks[i] }
        }
      });
      await httpRequest(chunkUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(chunkPayload)
        },
        timeout: 15000
      }, chunkPayload);
    }
  }

  return {
    url: `/storage/migrated/${filename}`,
    success: true
  };
}
