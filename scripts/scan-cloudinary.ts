import { initializeApp } from 'firebase/app';
import { initializeFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

// Read config
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const app = initializeApp({
  apiKey: firebaseConfig.apiKey,
  authDomain: firebaseConfig.authDomain,
  projectId: firebaseConfig.projectId,
  storageBucket: firebaseConfig.storageBucket,
  appId: firebaseConfig.appId,
});

const db = initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId || '(default)');

const COLLECTIONS = [
  'settings',
  'news',
  'matches',
  'media',
  'products',
  'players',
  'moments',
  'trivia',
  'polls',
  'banners',
  'club_history',
  'trophies',
  'board_members',
  'chants',
  'fan_photos',
  'academy_news',
  'basketball_news',
  'notifications',
  'social_posts',
  'partners',
  'store_categories',
  'broadcasts',
  'tickets',
  'users'
];

interface CloudinaryRef {
  collection: string;
  docId: string;
  fieldPath: string;
  url: string;
}

function findCloudinaryUrls(obj: any, currentPath = ''): Array<{ path: string; url: string }> {
  const results: Array<{ path: string; url: string }> = [];
  if (!obj) return results;

  if (typeof obj === 'string') {
    if (obj.includes('cloudinary.com/dqj6gzwfg') || obj.includes('res.cloudinary.com')) {
      results.push({ path: currentPath, url: obj });
    }
    return results;
  }

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      results.push(...findCloudinaryUrls(item, currentPath ? `${currentPath}[${index}]` : `[${index}]`));
    });
    return results;
  }

  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const p = currentPath ? `${currentPath}.${key}` : key;
      results.push(...findCloudinaryUrls(obj[key], p));
    }
  }

  return results;
}

async function runScan() {
  console.log('Starting Cloudinary URL scan across Firestore collections...');
  const allRefs: CloudinaryRef[] = [];
  const collectionStats: Record<string, number> = {};

  for (const colName of COLLECTIONS) {
    try {
      if (colName === 'settings') {
        const docRef = doc(db, 'settings', 'app_settings');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          const urls = findCloudinaryUrls(data);
          for (const u of urls) {
            allRefs.push({
              collection: colName,
              docId: 'app_settings',
              fieldPath: u.path,
              url: u.url
            });
          }
          collectionStats[colName] = urls.length;
        }
        continue;
      }

      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      let colCount = 0;

      snapshot.forEach(d => {
        const data = d.data();
        const urls = findCloudinaryUrls(data);
        for (const u of urls) {
          allRefs.push({
            collection: colName,
            docId: d.id,
            fieldPath: u.path,
            url: u.url
          });
          colCount++;
        }
      });

      collectionStats[colName] = colCount;
    } catch (err: any) {
      console.warn(`Could not read collection ${colName}:`, err.message || err);
    }
  }

  console.log('\n--- SCAN RESULTS ---');
  console.log('Total Cloudinary references found:', allRefs.length);
  for (const [col, count] of Object.entries(collectionStats)) {
    if (count > 0) {
      console.log(`  - ${col}: ${count} references`);
    }
  }

  // Unique URLs
  const uniqueUrls = Array.from(new Set(allRefs.map(r => r.url)));
  console.log('Unique Cloudinary URLs:', uniqueUrls.length);

  // Save to manifest
  const manifest = {
    scannedAt: new Date().toISOString(),
    totalReferences: allRefs.length,
    uniqueUrlsCount: uniqueUrls.length,
    collectionStats,
    uniqueUrls,
    references: allRefs
  };

  fs.writeFileSync('cloudinary-migration-manifest.json', JSON.stringify(manifest, null, 2));
  console.log('\nSaved scan manifest to cloudinary-migration-manifest.json');
}

runScan()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Scan error:', err);
    process.exit(1);
  });
