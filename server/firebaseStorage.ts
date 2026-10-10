import fs from 'fs';
import path from 'path';
import https from 'https';
import crypto from 'crypto';

interface FirebaseConfig {
  projectId: string;
  apiKey: string;
  storageBucket?: string;
  firestoreDatabaseId?: string;
}

function getConfig(): FirebaseConfig {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
  return {
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0026252792',
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'gen-lang-client-0026252792.firebasestorage.app',
    firestoreDatabaseId: process.env.VITE_FIREBASE_DATABASE_ID || 'ai-studio-6c80a8df-a84d-4bf3-9327-6de27bc8c8c6'
  };
}

function generateUUID(): string {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

export interface BucketStatus {
  ok: boolean;
  bucket: string;
  statusCode: number;
  error?: string;
  consoleUrl?: string;
  needsRulesUpdate?: boolean;
}

/**
 * Checks if the Firebase Storage bucket is active and ready
 */
export function checkBucketStatus(authToken?: string): Promise<BucketStatus> {
  return new Promise((resolve) => {
    const config = getConfig();
    const bucket = config.storageBucket || `${config.projectId}.firebasestorage.app`;
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?maxResults=1&key=${config.apiKey}`;
    const headers: Record<string, string> = {};
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = https.get(url, { headers, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true, bucket, statusCode: 200 });
        } else if (res.statusCode === 404) {
          resolve({
            ok: false,
            bucket,
            statusCode: 404,
            error: 'حزمة Firebase Storage غير مفعلة بعد في هذا المشروع.',
            consoleUrl: `https://console.firebase.google.com/project/${config.projectId}/storage`
          });
        } else if (res.statusCode === 403) {
          resolve({
            ok: false,
            bucket,
            statusCode: 403,
            needsRulesUpdate: true,
            error: 'الحزمة مفعلة، لكن قواعد الأمان (Rules) بحاجة لتحديث للسماح بالرفع (403 Permission Denied).',
            consoleUrl: `https://console.firebase.google.com/project/${config.projectId}/storage/rules`
          });
        } else {
          resolve({
            ok: false,
            bucket,
            statusCode: res.statusCode || 500,
            error: data
          });
        }
      });
    });

    req.on('error', (err) => {
      resolve({ ok: false, bucket, statusCode: 0, error: err.message });
    });
  });
}

/**
 * Uploads a file buffer directly to Firebase Storage via REST API
 */
export function uploadToFirebaseStorage(
  destinationPath: string,
  buffer: Buffer,
  contentType = 'image/jpeg',
  authToken?: string
): Promise<{ success: boolean; downloadUrl: string; token: string; size: number }> {
  return new Promise((resolve, reject) => {
    const config = getConfig();
    const bucket = config.storageBucket || `${config.projectId}.firebasestorage.app`;
    const downloadToken = generateUUID();
    const encodedName = encodeURIComponent(destinationPath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o?uploadType=media&name=${encodedName}&key=${config.apiKey}`;

    const headers: Record<string, string | number> = {
      'Content-Type': contentType,
      'Content-Length': buffer.length,
      'x-goog-meta-firebasestoragedownloadtokens': downloadToken
    };
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const req = https.request(url, {
      method: 'POST',
      headers,
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const j = JSON.parse(data);
            const token = j.downloadTokens || downloadToken;
            const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedName}?alt=media&token=${token}`;
            resolve({
              success: true,
              downloadUrl,
              token,
              size: buffer.length
            });
          } catch (e: any) {
            reject(new Error(`Failed to parse upload response: ${e.message}`));
          }
        } else {
          reject(new Error(`Firebase Storage upload failed with HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout uploading ${destinationPath} to Firebase Storage`));
    });

    req.on('error', reject);
    req.write(buffer);
    req.end();
  });
}

/**
 * Verifies that the uploaded image is actually accessible at the download URL
 */
export function verifyDownloadUrl(url: string, expectedMinSize: number): Promise<{ verified: boolean; bytes?: number; error?: string }> {
  return new Promise((resolve) => {
    https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(verifyDownloadUrl(res.headers.location, expectedMinSize));
      }
      if (res.statusCode === 200) {
        let bytesReceived = 0;
        res.on('data', c => bytesReceived += c.length);
        res.on('end', () => {
          if (bytesReceived >= expectedMinSize * 0.8) {
            resolve({ verified: true, bytes: bytesReceived });
          } else {
            resolve({ verified: false, error: `حجم غير متطابق: تم استلام ${bytesReceived} بايت، المتوقع >= ${expectedMinSize * 0.8}` });
          }
        });
      } else {
        resolve({ verified: false, error: `HTTP ${res.statusCode}` });
      }
    }).on('error', (err) => {
      resolve({ verified: false, error: err.message });
    });
  });
}

/**
 * Updates Firestore document to retain ONLY metadata and URL (removes heavy base64 data field)
 */
export function updateFirestoreMetadata(
  filename: string,
  downloadUrl: string,
  storagePath: string,
  size: number,
  contentType: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const config = getConfig();
    const docId = encodeURIComponent(filename);
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/app_images/${docId}?updateMask.fieldPaths=name&updateMask.fieldPaths=url&updateMask.fieldPaths=storagePath&updateMask.fieldPaths=provider&updateMask.fieldPaths=size&updateMask.fieldPaths=contentType&updateMask.fieldPaths=updatedAt&key=${config.apiKey}`;

    const docData = {
      fields: {
        name: { stringValue: filename },
        url: { stringValue: downloadUrl },
        storagePath: { stringValue: storagePath },
        provider: { stringValue: 'firebase_storage' },
        size: { integerValue: String(size) },
        contentType: { stringValue: contentType || 'image/jpeg' },
        updatedAt: { stringValue: new Date().toISOString() }
      }
    };

    const payload = JSON.stringify(docData);
    const req = https.request(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      },
      timeout: 15000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(true);
        } else {
          reject(new Error(`Firestore update failed HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

/**
 * Cleans up subcollection chunks once document is verified in Firebase Storage
 */
export async function cleanChunkSubcollections(filename: string): Promise<void> {
  const config = getConfig();
  const docId = encodeURIComponent(filename);
  for (let i = 0; i < 15; i++) {
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/app_images/${docId}/chunks/${i}?key=${config.apiKey}`;
    await new Promise<void>((res) => {
      const req = https.request(url, { method: 'DELETE', timeout: 5000 }, () => res());
      req.on('error', () => res());
      req.end();
    });
  }
}

/**
 * Runs the migration to Firebase Storage with strict verification and metadata retention
 */
export async function runFirebaseStorageMigration(authToken?: string): Promise<any> {
  const config = getConfig();
  const bucketStatus = await checkBucketStatus(authToken);
  const reportPath = path.join(process.cwd(), 'public', 'firebase-storage-migration-report.json');

  if (!bucketStatus.ok) {
    const report = {
      status: bucketStatus.needsRulesUpdate ? 'needs_rules_update' : 'pending_bucket_activation',
      bucket: bucketStatus.bucket,
      error: bucketStatus.error,
      consoleUrl: bucketStatus.consoleUrl,
      needsRulesUpdate: bucketStatus.needsRulesUpdate,
      updatedAt: new Date().toISOString(),
      verifiedCount: 0,
      total: 220,
      instructions: bucketStatus.needsRulesUpdate
        ? 'حزمة التخزين مفعلة، ولكن قواعد أمان Firebase Storage تمنع الكتابة (403). يُرجى الانتقال إلى تبويب Rules في Firebase Storage وضبط السماح بالقراءة والكتابة.'
        : 'يُرجى الدخول إلى Firebase Console والضغط على Storage > Get Started لتفعيل حزمة التخزين، ثم إعادة المحاولة.'
    };
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return report;
  }

  const storageDir = path.join(process.cwd(), 'public', 'storage', 'migrated');
  const backupFile = path.join(process.cwd(), 'cloudinary-backup-index.json');
  
  if (!fs.existsSync(backupFile)) {
    throw new Error('لم يتم العثور على ملف النسخ الاحتياطي cloudinary-backup-index.json');
  }

  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const entries: [string, any][] = Object.entries(backup.results);

  let successCount = 0;
  let verifiedCount = 0;
  let failedCount = 0;
  const results: Record<string, any> = {};

  for (let idx = 0; idx < entries.length; idx++) {
    const [cUrl, meta] = entries[idx];
    const filename = meta.localPath ? meta.localPath.split('/').pop() : path.basename(cUrl);
    const localFile = path.join(storageDir, filename);

    if (!fs.existsSync(localFile)) {
      continue;
    }

    const buffer = fs.readFileSync(localFile);
    const destinationPath = `images/${filename}`;

    try {
      // 1. Upload to Firebase Storage
      const uploadRes = await uploadToFirebaseStorage(destinationPath, buffer, meta.contentType, authToken);

      // 2. VERIFY Download URL (Status 200 check)
      const verifyRes = await verifyDownloadUrl(uploadRes.downloadUrl, buffer.length);
      if (!verifyRes.verified) {
        throw new Error(`Verification failed: ${verifyRes.error}`);
      }
      verifiedCount++;

      // 3. ONLY AFTER VERIFICATION: update Firestore to retain URL + metadata
      await updateFirestoreMetadata(filename, uploadRes.downloadUrl, destinationPath, buffer.length, meta.contentType);

      // 4. Clean chunks in Firestore subcollections
      await cleanChunkSubcollections(filename);

      successCount++;
      results[filename] = {
        status: 'verified_and_saved',
        url: uploadRes.downloadUrl,
        size: buffer.length,
        verified: true
      };
    } catch (err: any) {
      failedCount++;
      results[filename] = {
        status: 'failed',
        error: err.message
      };
    }
  }

  const finalReport = {
    status: failedCount === 0 ? 'completed' : 'completed_with_errors',
    bucket: bucketStatus.bucket,
    total: entries.length,
    successCount,
    verifiedCount,
    failedCount,
    updatedAt: new Date().toISOString(),
    results
  };

  fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
  return finalReport;
}
