import { initializeApp } from 'firebase/app';
import { initializeFirestore, doc, getDoc, updateDoc, terminate } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

interface MigrationRef {
  collection: string;
  docId: string;
  fieldPath: string;
  url: string;
}

interface BackupIndex {
  results: Record<string, { localPath: string; size: number; contentType: string }>;
}

interface Manifest {
  references: MigrationRef[];
}

async function runMigration() {
  console.log('====================================================');
  console.log('   CLOUDINARY -> LOCAL/FIREBASE STORAGE MIGRATION   ');
  console.log('====================================================\n');

  // 1. Load Firebase Config
  const cfgPath = path.resolve('firebase-applet-config.json');
  if (!fs.existsSync(cfgPath)) {
    throw new Error('firebase-applet-config.json not found!');
  }
  const firebaseConfig = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
  const app = initializeApp(firebaseConfig);
  const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || '(default)');

  // 2. Load Backup Index
  const indexPath = path.resolve('cloudinary-backup-index.json');
  if (!fs.existsSync(indexPath)) {
    throw new Error('cloudinary-backup-index.json not found!');
  }
  const backupIndex: BackupIndex = JSON.parse(fs.readFileSync(indexPath, 'utf8'));

  // 3. Load Manifest
  const manifestPath = path.resolve('cloudinary-migration-manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('cloudinary-migration-manifest.json not found!');
  }
  const manifest: Manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // 4. Ensure public/storage/migrated/ exists
  const publicStorageDir = path.resolve('public/storage/migrated');
  if (!fs.existsSync(publicStorageDir)) {
    fs.mkdirSync(publicStorageDir, { recursive: true });
  }

  // 5. Build migrated URL map
  const migratedMap: Record<string, string> = {};
  for (const [cloudinaryUrl, info] of Object.entries(backupIndex.results)) {
    const filename = path.basename(info.localPath);
    const destPath = path.join(publicStorageDir, filename);

    if (!fs.existsSync(destPath) && fs.existsSync(info.localPath)) {
      fs.copyFileSync(info.localPath, destPath);
    }

    const newUrl = `/storage/migrated/${filename}`;
    migratedMap[cloudinaryUrl] = newUrl;
  }

  console.log(`[Mapping] Prepared ${Object.keys(migratedMap).length} image URLs.\n`);

  // 6. Migrate Firestore References
  const totalRefs = manifest.references.length;
  console.log(`[Firestore] Processing ${totalRefs} document references...`);

  let completedCount = 0;
  let alreadyMigratedCount = 0;
  let failedCount = 0;
  let docNotFoundCount = 0;

  const itemsReport: Array<{
    collection: string;
    docId: string;
    fieldPath: string;
    originalUrl: string;
    newUrl: string;
    status: 'completed' | 'failed' | 'skipped';
    error?: string;
  }> = [];

  for (let i = 0; i < manifest.references.length; i++) {
    const ref = manifest.references[i];
    const originalUrl = ref.url;
    const newUrl = migratedMap[originalUrl] || originalUrl;

    const progressPrefix = `[${i + 1}/${totalRefs}] ${ref.collection}/${ref.docId} (${ref.fieldPath}):`;

    try {
      const docRef = doc(db, ref.collection, ref.docId);
      const snap = await getDoc(docRef);

      if (!snap.exists()) {
        console.warn(`${progressPrefix} Document not found.`);
        docNotFoundCount++;
        itemsReport.push({
          collection: ref.collection,
          docId: ref.docId,
          fieldPath: ref.fieldPath,
          originalUrl,
          newUrl,
          status: 'skipped',
          error: 'Document does not exist in Firestore'
        });
        continue;
      }

      const data = snap.data();
      const currentVal = data[ref.fieldPath];

      if (currentVal === newUrl) {
        // Already updated
        alreadyMigratedCount++;
        itemsReport.push({
          collection: ref.collection,
          docId: ref.docId,
          fieldPath: ref.fieldPath,
          originalUrl,
          newUrl,
          status: 'completed'
        });
        continue;
      }

      // Update document
      await updateDoc(docRef, {
        [ref.fieldPath]: newUrl
      });

      completedCount++;
      itemsReport.push({
        collection: ref.collection,
        docId: ref.docId,
        fieldPath: ref.fieldPath,
        originalUrl,
        newUrl,
        status: 'completed'
      });

      if ((i + 1) % 25 === 0 || i + 1 === totalRefs) {
        console.log(`  -> Progress: ${i + 1}/${totalRefs} items processed (${completedCount} updated, ${alreadyMigratedCount} already current).`);
      }

      // 15ms interval to ensure smooth execution
      await new Promise(r => setTimeout(r, 15));

    } catch (err: any) {
      failedCount++;
      console.error(`${progressPrefix} FAILED:`, err.message);
      itemsReport.push({
        collection: ref.collection,
        docId: ref.docId,
        fieldPath: ref.fieldPath,
        originalUrl,
        newUrl,
        status: 'failed',
        error: err.message
      });
    }
  }

  // 7. Generate Complete Reports
  const report = {
    exportedAt: new Date().toISOString(),
    summary: {
      total: totalRefs,
      completed: completedCount + alreadyMigratedCount,
      newlyUpdated: completedCount,
      alreadyMigrated: alreadyMigratedCount,
      docNotFound: docNotFoundCount,
      failed: failedCount
    },
    migratedMap,
    items: itemsReport
  };

  const reportPath = path.resolve('cloudinary-migration-report-completed.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  // Also write to public folder so administrators can view or download it directly
  const publicReportPath = path.resolve('public/cloudinary-migration-report-latest.json');
  fs.writeFileSync(publicReportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n====================================================');
  console.log('               MIGRATION COMPLETE                   ');
  console.log('====================================================');
  console.log(`Total References:     ${totalRefs}`);
  console.log(`Completed / Current:  ${completedCount + alreadyMigratedCount}`);
  console.log(`Newly Updated:        ${completedCount}`);
  console.log(`Already Current:      ${alreadyMigratedCount}`);
  console.log(`Docs Not Found:       ${docNotFoundCount}`);
  console.log(`Failed:               ${failedCount}`);
  console.log(`Report saved to:      ${reportPath}`);
  console.log(`Public Report at:     ${publicReportPath}`);
  console.log('====================================================\n');

  await terminate(db);
}

runMigration().catch(err => {
  console.error('Fatal Migration Error:', err);
  process.exit(1);
});
