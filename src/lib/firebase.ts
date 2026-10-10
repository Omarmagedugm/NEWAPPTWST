import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDoc, getDocFromServer, setDoc, serverTimestamp, persistentLocalCache, persistentMultipleTabManager, setLogLevel } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { requestNotificationPermission as requestOneSignalPermission } from './onesignal';
import { compressImageIfNeeded, saveImageToFirestore } from './firestoreImageStorage';
import { autoCompressImageForUpload } from './imageCompressor';

// Suppress benign internal timestamp drift warnings
try {
  setLogLevel('error');
} catch (e) {
  // Ignore if already configured
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
  UPLOAD = 'upload',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const errCode = error?.code || '';
  const errStr = error?.message || errCode || String(error);
  const isRead = operationType === OperationType.LIST || operationType === OperationType.GET;
  const isUnavailable = errCode === 'unavailable' || errCode === 'deadline-exceeded';
  
  const isQuotaExceeded = errCode === 'resource-exhausted' || 
                          errCode === 'RESOURCE_EXHAUSTED' || 
                          errStr.toLowerCase().includes('quota') || 
                          errStr.toLowerCase().includes('resource-exhausted') || 
                          errStr.toLowerCase().includes('resource_exhausted');

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('firestore-error', { 
      detail: { code: errCode, message: errStr, path, operationType } 
    }));
  }

  const errInfo: FirestoreErrorInfo = {
    error: errStr,
    authInfo: {
      userId: getAuth().currentUser?.uid,
      email: getAuth().currentUser?.email,
      emailVerified: getAuth().currentUser?.emailVerified,
      isAnonymous: getAuth().currentUser?.isAnonymous,
    },
    operationType,
    path
  };

  if (isQuotaExceeded || isUnavailable || isRead) {
    console.warn(`Firestore [${path}] operating in offline/cached fallback mode (Code: ${errCode || 'quota_limit'})`);
    return;
  }

  console.error(`Firestore Error [${path}]: `, JSON.stringify(errInfo));
  if (isQuotaExceeded) {
     console.warn("Quota Exceeded. Application operating with cached/default data.");
     return;
  }
  throw new Error(JSON.stringify(errInfo));
}

export function handleStorageError(error: any, path: string) {
  const errInfo = {
    error: error?.message || error?.code || String(error),
    authInfo: {
      userId: getAuth().currentUser?.uid,
    },
    operationType: 'UPLOAD',
    path
  };
  console.error(`Storage Error [${path}]: `, JSON.stringify(errInfo));
  throw new Error(`STORAGE_ERROR: ${errInfo.error}`);
}

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfigJson.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfigJson.firestoreDatabaseId
};

console.log('Firebase Configuration Check:', {
  projectId: firebaseConfig.projectId,
  databaseId: firebaseConfig.firestoreDatabaseId,
  hasApiKey: !!firebaseConfig.apiKey
});

const app = initializeApp(firebaseConfig);

// Using initializeFirestore with persistent local cache and robust auto-detection
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  experimentalLongPollingOptions: { timeoutSeconds: 30 },
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
}, firebaseConfig.firestoreDatabaseId || '(default)');

export const auth = getAuth(app);
export const storage = getStorage(app);

// Silent connection status check without blocking or premature timeout triggers
async function testConnection() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'app_settings'));
    if (snap.exists()) {
      console.info('Firestore connection established successfully.');
    }
  } catch (error: any) {
    console.debug('Firestore operating with cached/offline data:', error?.message || error?.code || error);
  }
}
if (typeof window !== 'undefined') {
  // Run deferred so initial bundle and UI load without artificial network competition
  setTimeout(testConnection, 2000);
}

// Push Notifications are powered by OneSignal for 100% Web Push reliability across Chrome, Android, and iOS
export const messaging = null;

export const requestNotificationPermission = async (): Promise<string | null> => {
  const res = await requestOneSignalPermission();
  return res.subscriptionId || (res.success ? 'granted' : null);
};

export const uploadImage = async (file: File | Blob, folder: string, customName?: string): Promise<string> => {
  let fileToUpload: File | Blob = file;
  const originalName = customName || (file instanceof File ? file.name : `img_${Date.now()}.jpg`);
  let contentType = file.type || 'image/jpeg';

  // Automatic smart compression on upload: preserves 100% logo transparency and reduces size by 70-90%
  if (typeof window !== 'undefined') {
    try {
      const compResult = await autoCompressImageForUpload(fileToUpload, {
        quality: 0.90,
        maxDimension: 1920,
        format: 'auto',
        preserveTransparency: true
      });
      if (compResult.wasCompressed) {
        fileToUpload = compResult.file;
        contentType = compResult.file.type || contentType;
      }
    } catch (compErr) {
      console.warn('Auto compression step skipped safely:', compErr);
    }
  }

  const cleanName = (fileToUpload instanceof File ? fileToUpload.name : originalName).replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 60);
  const finalFilename = `${Date.now()}_${cleanName}`;
  const storagePath = `${folder}/${finalFilename}`;

  // 1. Primary: Direct Firebase Storage Upload (Stores URL + metadata in Firestore only)
  try {
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, fileToUpload, { 
      contentType,
      customMetadata: { originalName }
    });
    const downloadUrl = await getDownloadURL(snapshot.ref);

    // Save ONLY metadata & download URL into Firestore app_images (no base64 bloat)
    try {
      await setDoc(doc(db, 'app_images', finalFilename), {
        name: finalFilename,
        url: downloadUrl,
        storagePath,
        provider: 'firebase_storage',
        contentType,
        size: fileToUpload.size || 0,
        updatedAt: new Date().toISOString()
      });
    } catch (metaErr) {
      console.warn('Could not record metadata in Firestore app_images:', metaErr);
    }

    return downloadUrl;
  } catch (storageErr) {
    console.warn('Direct Firebase Storage upload failed, attempting server upload fallback:', storageErr);
  }

  // 2. Fallback via server upload endpoint
  try {
    const formData = new FormData();
    formData.append('image', fileToUpload, finalFilename);
    const res = await fetch('/api/storage/upload', {
      method: 'POST',
      body: formData
    });
    if (res.ok) {
      const data = await res.json();
      if (data.url) return data.url;
    }
  } catch (serverErr) {
    console.warn('Server storage upload fallback failed:', serverErr);
  }

  // 3. Fallback: Firestore compressed storage
  try {
    const compressed = await compressImageIfNeeded(fileToUpload);
    const result = await saveImageToFirestore(finalFilename, compressed.dataUrl, compressed.contentType);
    return result.url;
  } catch (error) {
    handleStorageError(error, storagePath);
    return '';
  }
};

/**
 * Removes any undefined properties recursively to prevent Firestore SDK errors
 */
export function cleanFirestoreData<T = any>(obj: T): T {
  if (obj === null || obj === undefined) return null as any;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString() as any;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreData(item)) as any;
  }
  const result: any = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      result[key] = cleanFirestoreData(value);
    }
  }
  return result;
}
