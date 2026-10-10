const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'firebase-applet-config.json'), 'utf8'));
const backupFile = path.join(__dirname, '..', 'cloudinary-backup-index.json');
const storageDir = path.join(__dirname, '..', 'public', 'storage', 'migrated');

if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

const CHUNK_SIZE = 600000; // ~600KB base64 chunk size for Firestore

function downloadFile(url, retries = 3) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const req = client.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(downloadFile(res.headers.location, retries));
      }
      if (res.statusCode !== 200) {
        if (retries > 0) {
          return setTimeout(() => resolve(downloadFile(url, retries - 1)), 1000);
        }
        return reject(new Error(`Failed to download ${url}: HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });

    req.on('timeout', () => {
      req.destroy();
      if (retries > 0) return setTimeout(() => resolve(downloadFile(url, retries - 1)), 1000);
      reject(new Error(`Timeout downloading ${url}`));
    });

    req.on('error', (err) => {
      if (retries > 0) return setTimeout(() => resolve(downloadFile(url, retries - 1)), 1000);
      reject(err);
    });
  });
}

function checkFirestoreDocExists(filename) {
  return new Promise((resolve) => {
    const docId = encodeURIComponent(filename);
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/app_images/${docId}?key=${config.apiKey}`;
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const j = JSON.parse(data);
            if (j.fields && j.fields.name) return resolve(true);
          } catch (e) {}
        }
        resolve(false);
      });
    }).on('error', () => resolve(false));
  });
}

function patchFirestoreDoc(pathSuffix, docData) {
  return new Promise((resolve, reject) => {
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/${pathSuffix}?key=${config.apiKey}`;
    const payload = JSON.stringify(docData);
    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 20000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`Firestore PATCH ${pathSuffix} returned ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout writing to Firestore: ${pathSuffix}`));
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function uploadToFirestore(filename, buffer, contentType) {
  const base64 = buffer.toString('base64');
  const docId = encodeURIComponent(filename);

  if (base64.length <= CHUNK_SIZE) {
    // Single document
    await patchFirestoreDoc(`app_images/${docId}`, {
      fields: {
        name: { stringValue: filename },
        contentType: { stringValue: contentType || 'image/jpeg' },
        size: { integerValue: String(buffer.length) },
        chunksCount: { integerValue: '1' },
        data: { stringValue: base64 },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    });
  } else {
    // Multi-chunk document
    const chunks = [];
    for (let i = 0; i < base64.length; i += CHUNK_SIZE) {
      chunks.push(base64.slice(i, i + CHUNK_SIZE));
    }

    // Root metadata
    await patchFirestoreDoc(`app_images/${docId}`, {
      fields: {
        name: { stringValue: filename },
        contentType: { stringValue: contentType || 'image/jpeg' },
        size: { integerValue: String(buffer.length) },
        chunksCount: { integerValue: String(chunks.length) },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    });

    // Write chunk docs
    for (let i = 0; i < chunks.length; i++) {
      await patchFirestoreDoc(`app_images/${docId}/chunks/${i}`, {
        fields: {
          index: { integerValue: String(i) },
          data: { stringValue: chunks[i] }
        }
      });
    }
  }
}

async function main() {
  console.log('🚀 Starting full migration of Cloudinary images to Firestore app_images collection...');
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const entries = Object.entries(backup.results);
  console.log(`Total images to process: ${entries.length}`);

  let successCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  const failedList = [];
  const results = {};

  const concurrency = 3;
  let index = 0;

  async function worker() {
    while (index < entries.length) {
      const currentIdx = index++;
      const [cUrl, meta] = entries[currentIdx];
      const filename = meta.localPath ? meta.localPath.split('/').pop() : path.basename(cUrl);
      const localFilePath = path.join(storageDir, filename);

      try {
        // 1. Check if already in Firestore
        const alreadyInFirestore = await checkFirestoreDocExists(filename);
        if (alreadyInFirestore) {
          skippedCount++;
          results[filename] = { status: 'already_migrated', size: meta.size };
          if (currentIdx % 10 === 0 || currentIdx === entries.length - 1) {
            console.log(`[${currentIdx + 1}/${entries.length}] ⏩ Exists in Firestore: ${filename}`);
          }
          continue;
        }

        // 2. Obtain buffer
        let buffer;
        if (fs.existsSync(localFilePath)) {
          buffer = fs.readFileSync(localFilePath);
        } else {
          buffer = await downloadFile(cUrl);
          fs.writeFileSync(localFilePath, buffer);
        }

        // 3. Upload to Firestore
        await uploadToFirestore(filename, buffer, meta.contentType || 'image/jpeg');
        successCount++;
        results[filename] = { status: 'uploaded', size: buffer.length };
        console.log(`[${currentIdx + 1}/${entries.length}] ✅ Uploaded to Firestore: ${filename} (${Math.round(buffer.length / 1024)} KB)`);
      } catch (err) {
        failedCount++;
        failedList.push({ filename, url: cUrl, error: err.message });
        console.error(`[${currentIdx + 1}/${entries.length}] ❌ Failed: ${filename}:`, err.message);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  const report = {
    migratedAt: new Date().toISOString(),
    total: entries.length,
    successCount,
    skippedCount,
    failedCount,
    failedList,
    results
  };

  const reportPath = path.join(__dirname, '..', 'public', 'firestore-images-migration-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  console.log('🎉 Migration Completed!');
  console.log(`✅ Uploaded: ${successCount}`);
  console.log(`⏩ Already Existed: ${skippedCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`📄 Report saved to: ${reportPath}`);
}

main().catch(err => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
