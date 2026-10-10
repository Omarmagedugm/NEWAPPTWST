import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  getDocs, 
  deleteDoc, 
  Firestore,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';

export interface StoredAppImage {
  name: string;
  contentType: string;
  size: number;
  chunksCount: number;
  data?: string; // base64 payload when chunksCount === 1
  updatedAt: string;
}

const CHUNK_SIZE = 650000; // ~650KB per chunk to safely remain well within Firestore 1MB document limit

/**
 * Sanitizes an image name for use as a Firestore document ID and filename
 */
export function sanitizeImageName(name: string): string {
  return name.trim().replace(/[\\/]/g, '_').slice(0, 120);
}

/**
 * Compresses an image file in the browser using HTML5 Canvas to ensure optimal size and quality
 */
export async function compressImageIfNeeded(file: File | Blob, maxWidth = 1920, quality = 0.88): Promise<{ dataUrl: string; contentType: string; size: number }> {
  return new Promise((resolve) => {
    // If not in browser (Node.js environment) or not an image, read as DataURL directly
    if (typeof window === 'undefined' || typeof FileReader === 'undefined' || !file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve({
          dataUrl: result,
          contentType: file.type || 'image/jpeg',
          size: file.size
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        // Fallback to FileReader
        const reader = new FileReader();
        reader.onload = () => resolve({ dataUrl: reader.result as string, contentType: file.type, size: file.size });
        reader.readAsDataURL(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      const compressedDataUrl = canvas.toDataURL(mimeType, quality);
      
      // Calculate approximate base64 size
      const base64Len = compressedDataUrl.split(',')[1]?.length || 0;
      const byteSize = Math.round((base64Len * 3) / 4);

      resolve({
        dataUrl: compressedDataUrl,
        contentType: mimeType,
        size: byteSize
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      const reader = new FileReader();
      reader.onload = () => resolve({ dataUrl: reader.result as string, contentType: file.type, size: file.size });
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Saves an image to Firestore directly in the `app_images` collection.
 * Automatically handles chunking if the image exceeds the single document size limit.
 */
export async function saveImageToFirestore(
  name: string,
  base64OrDataUrl: string,
  contentType = 'image/jpeg',
  firestoreInstance: Firestore = db
): Promise<{ success: boolean; url: string; name: string }> {
  const cleanName = sanitizeImageName(name);
  const base64Data = base64OrDataUrl.includes(',') ? base64OrDataUrl.split(',')[1] : base64OrDataUrl;
  const size = Math.round((base64Data.length * 3) / 4);
  const docRef = doc(firestoreInstance, 'app_images', cleanName);

  if (base64Data.length <= CHUNK_SIZE) {
    // Fits in a single document
    await setDoc(docRef, {
      name: cleanName,
      contentType,
      size,
      chunksCount: 1,
      data: base64Data,
      updatedAt: new Date().toISOString()
    });
  } else {
    // Multi-chunk document
    const chunks: string[] = [];
    for (let i = 0; i < base64Data.length; i += CHUNK_SIZE) {
      chunks.push(base64Data.slice(i, i + CHUNK_SIZE));
    }

    // Save metadata
    await setDoc(docRef, {
      name: cleanName,
      contentType,
      size,
      chunksCount: chunks.length,
      updatedAt: new Date().toISOString()
    });

    // Save chunks to subcollection
    const chunksCol = collection(firestoreInstance, 'app_images', cleanName, 'chunks');
    for (let idx = 0; idx < chunks.length; idx++) {
      const chunkDoc = doc(chunksCol, String(idx));
      await setDoc(chunkDoc, {
        index: idx,
        data: chunks[idx]
      });
    }
  }

  // Both /storage/migrated/:name and /api/images/:name are routed to fetch from Firestore
  const publicUrl = `/storage/migrated/${cleanName}`;
  return {
    success: true,
    url: publicUrl,
    name: cleanName
  };
}

/**
 * Retrieves an image from Firestore by its name.
 * Reassembles chunks if the image was stored in multiple pieces.
 */
export async function getImageFromFirestore(
  name: string,
  firestoreInstance: Firestore = db
): Promise<{ name: string; contentType: string; buffer: Buffer; size: number } | null> {
  const cleanName = sanitizeImageName(name);
  const docRef = doc(firestoreInstance, 'app_images', cleanName);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return null;
  }

  const info = snap.data() as StoredAppImage;
  let fullBase64 = '';

  if (info.chunksCount === 1 && info.data) {
    fullBase64 = info.data;
  } else if (info.chunksCount > 1) {
    const chunksCol = collection(firestoreInstance, 'app_images', cleanName, 'chunks');
    const chunksSnap = await getDocs(chunksCol);
    const chunkList: { index: number; data: string }[] = [];
    chunksSnap.forEach((d) => {
      const cData = d.data();
      chunkList.push({ index: cData.index, data: cData.data });
    });
    chunkList.sort((a, b) => a.index - b.index);
    fullBase64 = chunkList.map((c) => c.data).join('');
  } else if (info.data) {
    fullBase64 = info.data;
  }

  if (!fullBase64) return null;

  return {
    name: info.name,
    contentType: info.contentType || 'image/jpeg',
    buffer: Buffer.from(fullBase64, 'base64'),
    size: info.size || Math.round((fullBase64.length * 3) / 4)
  };
}
