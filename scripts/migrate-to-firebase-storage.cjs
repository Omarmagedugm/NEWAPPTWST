const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const configPath = path.join(__dirname, '..', 'firebase-applet-config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const storageDir = path.join(__dirname, '..', 'public', 'storage', 'migrated');
const backupFile = path.join(__dirname, '..', 'cloudinary-backup-index.json');
const reportPath = path.join(__dirname, '..', 'public', 'firebase-storage-migration-report.json');

const BUCKET = config.storageBucket || `${config.projectId}.firebasestorage.app`;
const API_KEY = config.apiKey;

function generateUUID() {
  return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
}

/**
 * Checks if the Firebase Storage bucket is accessible
 */
function checkBucketStatus() {
  return new Promise((resolve) => {
    const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?maxResults=1&key=${API_KEY}`;
    https.get(url, { timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve({ ok: true, bucket: BUCKET, statusCode: 200 });
        } else if (res.statusCode === 404) {
          resolve({
            ok: false,
            bucket: BUCKET,
            statusCode: 404,
            error: 'Bucket not initialized. Visit Firebase Console to enable Storage.',
            consoleUrl: `https://console.firebase.google.com/project/${config.projectId}/storage`
          });
        } else {
          resolve({
            ok: false,
            bucket: BUCKET,
            statusCode: res.statusCode,
            error: data
          });
        }
      });
    }).on('error', (err) => {
      resolve({ ok: false, bucket: BUCKET, statusCode: 0, error: err.message });
    });
  });
}

/**
 * Uploads a file buffer directly to Firebase Storage via REST API
 */
function uploadToFirebaseStorage(destinationPath, buffer, contentType) {
  return new Promise((resolve, reject) => {
    const downloadToken = generateUUID();
    const encodedName = encodeURIComponent(destinationPath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o?uploadType=media&name=${encodedName}&key=${API_KEY}`;

    const req = https.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': contentType || 'image/jpeg',
        'Content-Length': buffer.length,
        'x-goog-meta-firebasestoragedownloadtokens': downloadToken
      },
      timeout: 30000
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const j = JSON.parse(data);
            const token = j.downloadTokens || downloadToken;
            const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodedName}?alt=media&token=${token}`;
            resolve({
              success: true,
              downloadUrl,
              token,
              bucket: BUCKET,
              path: destinationPath,
              size: buffer.length
            });
          } catch (e) {
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
function verifyDownloadUrl(url, expectedMinSize) {
  return new Promise((resolve) => {
    https.get(url, { timeout: 15000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(verifyDownloadUrl(res.headers.location, expectedMinSize));
      }
      if (res.statusCode === 200) {
        let bytesReceived = 0;
        res.on('data', c => bytesReceived += c.length);
        res.on('end', () => {
          if (bytesReceived >= expectedMinSize * 0.8) {
            resolve({ verified: true, bytes: bytesReceived });
          } else {
            resolve({ verified: false, error: `Size mismatch: received ${bytesReceived}, expected >= ${expectedMinSize * 0.8}` });
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
 * Updates Firestore document to retain ONLY metadata and URL (removes heavy data field)
 */
function updateFirestoreMetadata(filename, downloadUrl, storagePath, size, contentType) {
  return new Promise((resolve, reject) => {
    const docId = encodeURIComponent(filename);
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/app_images/${docId}?updateMask.fieldPaths=name&updateMask.fieldPaths=url&updateMask.fieldPaths=storagePath&updateMask.fieldPaths=provider&updateMask.fieldPaths=size&updateMask.fieldPaths=contentType&updateMask.fieldPaths=updatedAt&key=${API_KEY}`;

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
 * Removes subcollection chunks if any existed for this doc
 */
async function cleanChunkSubcollections(filename) {
  // We check up to 15 chunks
  for (let i = 0; i < 15; i++) {
    const docId = encodeURIComponent(filename);
    const url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/app_images/${docId}/chunks/${i}?key=${API_KEY}`;
    await new Promise((res) => {
      const req = https.request(url, { method: 'DELETE', timeout: 5000 }, () => res());
      req.on('error', () => res());
      req.end();
    });
  }
}

async function runMigration() {
  console.log('🔍 Checking Firebase Storage bucket status...');
  const bucketStatus = await checkBucketStatus();

  if (!bucketStatus.ok) {
    console.error('⚠️ Firebase Storage is not yet accessible:', bucketStatus.error);
    console.log(`🔗 Please enable Storage in Firebase Console: ${bucketStatus.consoleUrl || 'https://console.firebase.google.com'}`);
    
    // Write report detailing requirement
    const initialReport = {
      status: 'pending_bucket_activation',
      bucket: BUCKET,
      error: bucketStatus.error,
      consoleUrl: bucketStatus.consoleUrl,
      updatedAt: new Date().toISOString(),
      verifiedCount: 0,
      total: 220
    };
    fs.writeFileSync(reportPath, JSON.stringify(initialReport, null, 2));
    return initialReport;
  }

  console.log('✅ Firebase Storage bucket is ACTIVE and ready!');
  const backup = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const entries = Object.entries(backup.results);
  console.log(`📦 Found ${entries.length} images to migrate to Firebase Storage.`);

  let successCount = 0;
  let verifiedCount = 0;
  let failedCount = 0;
  const results = {};

  for (let idx = 0; idx < entries.length; idx++) {
    const [cUrl, meta] = entries[idx];
    const filename = meta.localPath ? meta.localPath.split('/').pop() : path.basename(cUrl);
    const localFile = path.join(storageDir, filename);

    if (!fs.existsSync(localFile)) {
      console.warn(`[${idx + 1}/${entries.length}] Skipping missing local file: ${filename}`);
      continue;
    }

    const buffer = fs.readFileSync(localFile);
    const destinationPath = `images/${filename}`;

    try {
      // 1. Upload to Firebase Storage
      const uploadRes = await uploadToFirebaseStorage(destinationPath, buffer, meta.contentType);

      // 2. VERIFY Download URL (Status 200 check)
      const verifyRes = await verifyDownloadUrl(uploadRes.downloadUrl, buffer.length);
      if (!verifyRes.verified) {
        throw new Error(`Verification failed: ${verifyRes.error}`);
      }
      verifiedCount++;

      // 3. ONLY AFTER VERIFICATION: update Firestore with URL + metadata
      await updateFirestoreMetadata(filename, uploadRes.downloadUrl, destinationPath, buffer.length, meta.contentType);

      // 4. Clean chunks in Firestore
      await cleanChunkSubcollections(filename);

      successCount++;
      results[filename] = {
        status: 'verified_and_saved',
        url: uploadRes.downloadUrl,
        size: buffer.length,
        verified: true
      };

      console.log(`[${idx + 1}/${entries.length}] ✅ Verified in Firebase Storage: ${filename}`);
    } catch (err) {
      failedCount++;
      console.error(`[${idx + 1}/${entries.length}] ❌ Failed for ${filename}:`, err.message);
      results[filename] = {
        status: 'failed',
        error: err.message
      };
    }
  }

  const finalReport = {
    status: failedCount === 0 ? 'completed' : 'completed_with_errors',
    bucket: BUCKET,
    total: entries.length,
    successCount,
    verifiedCount,
    failedCount,
    updatedAt: new Date().toISOString(),
    results
  };

  fs.writeFileSync(reportPath, JSON.stringify(finalReport, null, 2));
  console.log(`🎉 Migration finished! Verified: ${verifiedCount}/${entries.length}`);
  return finalReport;
}

if (require.main === module) {
  runMigration().then(console.log).catch(console.error);
}

module.exports = {
  checkBucketStatus,
  uploadToFirebaseStorage,
  verifyDownloadUrl,
  updateFirestoreMetadata,
  runMigration
};
