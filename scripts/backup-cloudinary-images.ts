import * as fs from 'fs';
import * as path from 'path';

interface Manifest {
  uniqueUrls: string[];
  references: Array<{
    collection: string;
    docId: string;
    fieldPath: string;
    url: string;
  }>;
}

async function backupImages() {
  const manifestPath = path.resolve('cloudinary-migration-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('Manifest file not found! Run scan first.');
    process.exit(1);
  }

  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  const backupDir = path.resolve('cloudinary_images_backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`Starting backup of ${manifest.uniqueUrls.length} unique images...`);
  const results: Record<string, { localPath: string; size: number; contentType: string }> = {};

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < manifest.uniqueUrls.length; i++) {
    const url = manifest.uniqueUrls[i];
    try {
      // Create a deterministic safe filename from URL
      const urlParts = url.split('/');
      const fileName = `${i + 1}_${urlParts[urlParts.length - 1].replace(/[^a-zA-Z0-9._-]/g, '_')}`;
      const localFilePath = path.join(backupDir, fileName);

      if (fs.existsSync(localFilePath) && fs.statSync(localFilePath).size > 0) {
        console.log(`[${i + 1}/${manifest.uniqueUrls.length}] Already downloaded: ${fileName}`);
        successCount++;
        results[url] = {
          localPath: `cloudinary_images_backup/${fileName}`,
          size: fs.statSync(localFilePath).size,
          contentType: 'image/jpeg'
        };
        continue;
      }

      console.log(`[${i + 1}/${manifest.uniqueUrls.length}] Downloading: ${url}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      fs.writeFileSync(localFilePath, buffer);

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      results[url] = {
        localPath: `cloudinary_images_backup/${fileName}`,
        size: buffer.length,
        contentType
      };

      successCount++;
    } catch (err: any) {
      console.error(`[${i + 1}/${manifest.uniqueUrls.length}] FAILED to download ${url}:`, err.message);
      failCount++;
    }
  }

  console.log(`\nBackup Complete: ${successCount} succeeded, ${failCount} failed.`);
  fs.writeFileSync(
    'cloudinary-backup-index.json',
    JSON.stringify({ backedUpAt: new Date().toISOString(), total: manifest.uniqueUrls.length, successCount, failCount, results }, null, 2)
  );
  console.log('Saved index to cloudinary-backup-index.json');
}

backupImages()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('Fatal backup error:', e);
    process.exit(1);
  });
