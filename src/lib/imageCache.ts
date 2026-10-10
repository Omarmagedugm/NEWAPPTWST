/**
 * Ultra-Fast Cross-Platform Image Caching & Memory Layer
 * Supports: Browser Cache Storage API, In-Memory Fast Lookup, PWA offline, iOS & Android
 */

const CACHE_NAME = 'ittihad-images-cache-v1';
const MAX_CACHE_ENTRIES = 250;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 Days

// Fast in-memory cache to eliminate re-render blink and DOM flash
const memoryLoadedSet = new Set<string>();

/**
 * Checks synchronously if an image is already known to be in memory
 */
export const isImageInMemory = (url: string | undefined | null): boolean => {
  if (!url) return false;
  return memoryLoadedSet.has(url);
};

/**
 * Marks an image as loaded in memory
 */
export const markImageLoaded = (url: string | undefined | null) => {
  if (url) {
    memoryLoadedSet.add(url);
  }
};

/**
 * Checks if an image is stored in CacheStorage
 */
export const isImageInBrowserCache = async (url: string): Promise<boolean> => {
  if (!url || typeof window === 'undefined' || !('caches' in window)) {
    return false;
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    const match = await cache.match(url);
    return !!match;
  } catch (e) {
    return false;
  }
};

/**
 * Pre-caches an image in Browser CacheStorage and memory
 */
export const cacheImage = async (url: string): Promise<boolean> => {
  if (!url || typeof window === 'undefined' || !('caches' in window) || url.startsWith('data:') || url.startsWith('blob:')) {
    return false;
  }
  try {
    const cache = await caches.open(CACHE_NAME);
    const existing = await cache.match(url);
    if (!existing) {
      // Fetch with cors/no-cors mode depending on origin
      const response = await fetch(url, { mode: 'cors' }).catch(() => fetch(url, { mode: 'no-cors' }));
      if (response && (response.ok || response.type === 'opaque')) {
        await cache.put(url, response.clone());
        memoryLoadedSet.add(url);
        return true;
      }
    } else {
      memoryLoadedSet.add(url);
      return true;
    }
  } catch (err) {
    // Fail silently without affecting UI
  }
  return false;
};

/**
 * Preload batch of critical images (e.g. logos, club badges)
 */
export const preloadImages = (urls: (string | undefined | null)[]) => {
  if (typeof window === 'undefined') return;
  
  urls.forEach((url) => {
    if (!url || memoryLoadedSet.has(url)) return;
    
    // In-memory HTML image preloader
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.decoding = 'async';
    img.onload = () => {
      memoryLoadedSet.add(url);
    };
    img.src = url;

    // Background Service Worker / CacheStorage caching
    if ('caches' in window && !url.startsWith('data:') && !url.startsWith('blob:')) {
      cacheImage(url).catch(() => {});
    }
  });
};

/**
 * LRU Cache Maintenance: Purges oldest entries if cache limit is exceeded
 */
export const trimImageCache = async () => {
  if (typeof window === 'undefined' || !('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await cache.keys();
    if (requests.length > MAX_CACHE_ENTRIES) {
      const deleteCount = requests.length - MAX_CACHE_ENTRIES;
      for (let i = 0; i < deleteCount; i++) {
        await cache.delete(requests[i]);
      }
    }
  } catch (e) {
    // Suppress error
  }
};

// Periodic light cleanup on idle
if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
  (window as any).requestIdleCallback(() => {
    trimImageCache().catch(() => {});
  });
}
