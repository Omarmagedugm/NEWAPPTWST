import { CLOUDINARY_TO_FIRESTORE_MAP } from './cloudinaryToFirestoreMap';

/**
 * Image URL resolution utility.
 * Prioritizes Firestore image storage (/storage/migrated/...) over Cloudinary.
 * Converts any legacy Cloudinary URLs directly to Firestore storage paths.
 */
export const getOptimizedImage = (url: string | undefined | null, width?: number) => {
  if (!url) return '';

  // 1. If it's already a Firestore / local storage URL or relative asset, serve directly
  if (url.startsWith('/storage/') || url.startsWith('/api/images/')) {
    return url;
  }

  // 2. Pass-through for data URLs, blobs, and relative assets
  if (
    url.startsWith('/') ||
    url.startsWith('data:') || 
    url.startsWith('blob:') || 
    url.endsWith('.svg') ||
    url.includes('firebasestorage.googleapis.com') ||
    url.includes('storage.googleapis.com') ||
    url.includes('wikimedia.org') ||
    url.includes('wikipedia.org') ||
    url.includes('ui-avatars.com') ||
    url.includes('lh3.googleusercontent.com')
  ) {
    return url;
  }

  // 3. If it's a legacy Cloudinary URL, resolve it to its Firestore storage equivalent
  if (url.includes('cloudinary.com')) {
    // Exact match check
    if (CLOUDINARY_TO_FIRESTORE_MAP[url]) {
      return CLOUDINARY_TO_FIRESTORE_MAP[url];
    }

    // Try finding by path segment (without query or transformations)
    const parts = url.split('/upload/');
    if (parts.length === 2) {
      let cleanPath = parts[1];
      const pathSegments = cleanPath.split('/');
      // Remove transformation tokens if any
      if (pathSegments.length > 1 && (pathSegments[0].includes('q_auto') || pathSegments[0].includes('f_auto') || pathSegments[0].includes('w_') || pathSegments[0].startsWith('c_'))) {
        cleanPath = pathSegments.slice(1).join('/');
      }
      // Strip version number (e.g. v1783876135/...)
      const withoutV = cleanPath.replace(/^v\d+\//, '');
      if (CLOUDINARY_TO_FIRESTORE_MAP[withoutV]) {
        return CLOUDINARY_TO_FIRESTORE_MAP[withoutV];
      }

      // Automatically add smart high-fidelity compression & transparency-preserving WebP/Auto
      const transforms = ['f_auto', 'q_auto:best'];
      if (width && width > 0) {
        transforms.push(`w_${width}`, 'c_limit');
      }
      return `${parts[0]}/upload/${transforms.join(',')}/${cleanPath}`;
    }
  }

  // 4. Return URL directly
  return url;
};
