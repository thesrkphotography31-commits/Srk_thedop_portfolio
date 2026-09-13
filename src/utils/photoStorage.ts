import { CatalogPhoto, determineAspectRatio } from '../components/PhotoCatalog';
import { analyzeCanvasPixels } from './photoAnalysis';

const DB_NAME = 'srk_photography_portfolio_db';
const DB_VERSION = 1;
const STORE_NAME = 'portfolio_stills';
const KEY_PHOTOS = 'catalog_stills_list';
const KEY_PROFILE = 'portfolio_profile_photo';

// Initialize or get the IndexedDB instance
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open database'));
    };
  });
}

/**
 * Sanitize photo list: removes any dead URLs, legacy template/sample photos
 * (such as Unsplash demo photos and catalog-* placeholders), and invalid records,
 * guaranteeing ONLY genuine user-uploaded stills are stored and displayed.
 */
export function sanitizePhotos(list: CatalogPhoto[]): CatalogPhoto[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter(p => 
      p && 
      typeof p.imageUrl === 'string' && 
      p.imageUrl.trim().length > 0 &&
      !p.imageUrl.includes('unsplash.com') &&
      !p.imageUrl.includes('photo-1608248597359-0a56e09307d8') &&
      !p.id?.startsWith('catalog-') &&
      !p.id?.startsWith('sample-') &&
      !p.id?.startsWith('demo-') &&
      !p.id?.startsWith('placeholder-')
    )
    .map(p => {
      // Ensure sensible metadata if missing
      const isPortrait = p.aspect !== '16/9' && p.aspect !== '21/9';
      return {
        ...p,
        mood: p.mood || (isPortrait ? 'golden-hour' : 'cinematic-noir'),
        colorSpace: p.colorSpace || (isPortrait ? 'warm-gold' : 'cool-cyan'),
        category: p.category || (isPortrait ? 'editorial-portrait' : 'cinematic-landscape'),
        dominantColor: p.dominantColor || (isPortrait ? '#9e8574' : '#6b7a82')
      };
    });
}

/**
 * Save photos list into persistent storage (Server API + IndexedDB + LocalStorage)
 */
export async function savePhotosToStorage(rawPhotos: CatalogPhoto[]): Promise<boolean> {
  const photos = sanitizePhotos(rawPhotos);
  let serverSaved = false;
  let idbSaved = false;

  // 1. Persist to server API if reachable
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('/api/photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photos),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      serverSaved = true;
    }
  } catch (err) {
    // Non-blocking, continue with local persistent storage
    console.debug('Server photo sync skipped/offline:', err);
  }

  // 2. Persist to IndexedDB
  try {
    const db = await openDB();
    idbSaved = await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putRequest = store.put(photos, KEY_PHOTOS);

      putRequest.onsuccess = () => {
        resolve(true);
      };

      putRequest.onerror = () => {
        console.error('IndexedDB put error:', putRequest.error);
        resolve(false);
      };

      tx.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('IndexedDB save failed:', error);
  }

  // 3. Keep localStorage updated with markers and backup data
  try {
    localStorage.setItem('srk_has_custom_photos', 'true');
    localStorage.setItem('srk_custom_photos_count', photos.length.toString());
    // Try to cache in localStorage as well if size allows
    try {
      localStorage.setItem('srk_portfolio_catalog_photos', JSON.stringify(photos));
    } catch {
      // If quota exceeded in localStorage, IndexedDB or Server handles it
    }
  } catch {
    // Ignore localStorage failures
  }

  return serverSaved || idbSaved;
}

/**
 * Load photos list from persistent storage (Server API -> IndexedDB -> LocalStorage)
 */
export async function loadPhotosFromStorage(): Promise<CatalogPhoto[] | null> {
  // 1. Try server persistence first
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('/api/photos', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const cleaned = sanitizePhotos(data as CatalogPhoto[]);
        // Cache in IndexedDB for immediate offline access next time
        openDB().then(db => {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(cleaned, KEY_PHOTOS);
            tx.oncomplete = () => db.close();
          } catch {}
        }).catch(() => {});
        return cleaned;
      }
    }
  } catch (err) {
    console.debug('Server load skipped/offline, trying IndexedDB:', err);
  }

  // 2. Try IndexedDB
  try {
    const db = await openDB();
    const dbResult = await new Promise<CatalogPhoto[] | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(KEY_PHOTOS);

      getRequest.onsuccess = () => {
        const result = getRequest.result;
        if (Array.isArray(result) && result.length > 0) {
          resolve(sanitizePhotos(result as CatalogPhoto[]));
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = () => {
        resolve(null);
      };

      tx.oncomplete = () => {
        db.close();
      };
    });

    if (dbResult && dbResult.length > 0) {
      // If sample photos were pruned, update IndexedDB and localStorage
      openDB().then(db => {
        try {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          tx.objectStore(STORE_NAME).put(dbResult, KEY_PHOTOS);
          tx.oncomplete = () => db.close();
        } catch {}
      }).catch(() => {});
      try {
        localStorage.setItem('srk_portfolio_catalog_photos', JSON.stringify(dbResult));
        localStorage.setItem('srk_custom_photos_count', dbResult.length.toString());
      } catch {}
      return dbResult;
    }
  } catch (error) {
    console.warn('IndexedDB read error:', error);
  }

  // 3. Fallback to localStorage
  try {
    const saved = localStorage.getItem('srk_portfolio_catalog_photos');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const cleaned = sanitizePhotos(parsed as CatalogPhoto[]);
        if (cleaned.length !== parsed.length) {
          try {
            localStorage.setItem('srk_portfolio_catalog_photos', JSON.stringify(cleaned));
            localStorage.setItem('srk_custom_photos_count', cleaned.length.toString());
          } catch {}
        }
        return cleaned;
      }
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Clear custom photos from all storage layers and reset to default
 */
export async function clearPhotosFromStorage(): Promise<boolean> {
  // 1. Reset on server
  try {
    await fetch('/api/photos/reset', { method: 'POST' });
  } catch {
    // Ignore server error
  }

  // 2. Clear localStorage
  try {
    localStorage.removeItem('srk_portfolio_catalog_photos');
    localStorage.removeItem('srk_has_custom_photos');
    localStorage.removeItem('srk_custom_photos_count');
  } catch {
    // ignore
  }

  // 3. Clear IndexedDB
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const deleteRequest = store.delete(KEY_PHOTOS);

      deleteRequest.onsuccess = () => {
        resolve(true);
      };

      deleteRequest.onerror = () => {
        resolve(false);
      };

      tx.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('Failed to clear photos from IndexedDB:', error);
    return false;
  }
}

/**
 * Persist About Me Profile Photo (Server API + IndexedDB + LocalStorage)
 */
export async function saveProfilePhotoToStorage(dataUrl: string): Promise<boolean> {
  if (!dataUrl) return false;
  let serverSaved = false;
  let idbSaved = false;

  // 1. Server API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl: dataUrl }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (res.ok) serverSaved = true;
  } catch (err) {
    console.debug('Server profile photo sync skipped/offline:', err);
  }

  // 2. IndexedDB
  try {
    const db = await openDB();
    idbSaved = await new Promise<boolean>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(dataUrl, KEY_PROFILE);
      putReq.onsuccess = () => resolve(true);
      putReq.onerror = () => resolve(false);
      tx.oncomplete = () => db.close();
    });
  } catch (err) {
    console.warn('IndexedDB profile save failed:', err);
  }

  // 3. LocalStorage
  try {
    localStorage.setItem('srk_portfolio_portrait', dataUrl);
  } catch (err) {
    // LocalStorage quota might be exceeded for high-res images, IndexedDB handles it safely
  }

  return serverSaved || idbSaved;
}

/**
 * Load About Me Profile Photo (Server API -> IndexedDB -> LocalStorage)
 */
export async function loadProfilePhotoFromStorage(): Promise<string | null> {
  // 1. Server API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);
    const res = await fetch('/api/profile', { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && data.photoUrl && typeof data.photoUrl === 'string' && data.photoUrl.length > 20) {
        // Cache in IndexedDB for immediate offline access
        openDB().then(db => {
          try {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).put(data.photoUrl, KEY_PROFILE);
            tx.oncomplete = () => db.close();
          } catch {}
        }).catch(() => {});
        return data.photoUrl;
      }
    }
  } catch (err) {
    console.debug('Server profile load skipped/offline, trying IndexedDB:', err);
  }

  // 2. IndexedDB
  try {
    const db = await openDB();
    const idbResult = await new Promise<string | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(KEY_PROFILE);
      getReq.onsuccess = () => {
        const val = getReq.result;
        if (typeof val === 'string' && val.length > 20) {
          resolve(val);
        } else {
          resolve(null);
        }
      };
      getReq.onerror = () => resolve(null);
      tx.oncomplete = () => db.close();
    });

    if (idbResult) return idbResult;
  } catch (err) {
    console.warn('IndexedDB profile read failed:', err);
  }

  // 3. LocalStorage fallback
  try {
    const cached = localStorage.getItem('srk_portfolio_portrait');
    if (cached && cached.length > 20) {
      return cached;
    }
  } catch {}

  return null;
}

export async function syncAllToCodebase(payload: {
  photos?: CatalogPhoto[];
  portrait?: string | null;
  hero?: string | null;
  heroFocus?: string;
  about?: any;
}): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/sync-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const data = await res.json();
      return { success: true, message: data.message || 'Synced to codebase!' };
    }
    return { success: false, message: 'Server returned error ' + res.status };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Network error syncing to server' };
  }
}

/**
 * Reset profile photo across all stores
 */
export async function clearProfilePhotoFromStorage(): Promise<boolean> {
  try {
    await fetch('/api/profile/reset', { method: 'POST' });
  } catch {}

  try {
    localStorage.removeItem('srk_portfolio_portrait');
  } catch {}

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const delReq = store.delete(KEY_PROFILE);
      delReq.onsuccess = () => resolve(true);
      delReq.onerror = () => resolve(false);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return false;
  }
}

/**
 * Optimizes high-resolution camera images for responsive web display and fast persistent caching
 * Scales massive images (e.g. 24-48 MP) to a high-density 2560px max dimension, preserving crystal clear
 * sharpness while keeping data sizes fast and preventing browser out-of-memory or quota limits.
 */
export function processAndOptimizeImage(file: File): Promise<{
  dataUrl: string;
  aspect: CatalogPhoto['aspect'];
  width: number;
  height: number;
  dominantColor?: string;
  colorSpace?: CatalogPhoto['colorSpace'];
  mood?: CatalogPhoto['mood'];
  category?: CatalogPhoto['category'];
}> {
  return new Promise((resolve, reject) => {
    let objectUrl = '';
    try {
      objectUrl = URL.createObjectURL(file);
    } catch {
      // If object URL cannot be created, fallback to FileReader
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = (e) => {
        resolve({
          dataUrl: e.target?.result as string,
          aspect: '16/9',
          width: 1920,
          height: 1080,
          dominantColor: '#6b7a82',
          colorSpace: 'cool-cyan',
          mood: 'cinematic-noir',
          category: 'cinematic-landscape'
        });
      };
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fallback
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          dataUrl: e.target?.result as string,
          aspect: '16/9',
          width: 1920,
          height: 1080,
          dominantColor: '#6b7a82',
          colorSpace: 'cool-cyan',
          mood: 'cinematic-noir',
          category: 'cinematic-landscape'
        });
      };
      reader.readAsDataURL(file);
    };

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const naturalWidth = img.naturalWidth || 1920;
      const naturalHeight = img.naturalHeight || 1080;
      const aspect = determineAspectRatio(naturalWidth, naturalHeight);

      // 2560px maximum dimension: provides razor-sharp 4K/retina rendering while keeping storage ultra lean
      const MAX_DIMENSION = 2560;

      let targetWidth = naturalWidth;
      let targetHeight = naturalHeight;

      if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
        if (targetWidth > targetHeight) {
          targetHeight = Math.round((targetHeight * MAX_DIMENSION) / targetWidth);
          targetWidth = MAX_DIMENSION;
        } else {
          targetWidth = Math.round((targetWidth * MAX_DIMENSION) / targetHeight);
          targetHeight = MAX_DIMENSION;
        }
      }

      try {
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              dataUrl: e.target?.result as string,
              aspect,
              width: naturalWidth,
              height: naturalHeight,
              dominantColor: '#6b7a82',
              colorSpace: 'cool-cyan',
              mood: 'cinematic-noir',
              category: 'cinematic-landscape'
            });
          };
          reader.readAsDataURL(file);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Analyze visual properties (color space, mood, category, dominant color)
        const analysis = analyzeCanvasPixels(canvas, targetWidth / targetHeight);

        let optimizedUrl = '';
        try {
          optimizedUrl = canvas.toDataURL('image/webp', 0.88);
          if (!optimizedUrl.startsWith('data:image/webp')) {
            optimizedUrl = canvas.toDataURL('image/jpeg', 0.88);
          }
        } catch {
          optimizedUrl = canvas.toDataURL('image/jpeg', 0.88);
        }

        resolve({
          dataUrl: optimizedUrl,
          aspect,
          width: targetWidth,
          height: targetHeight,
          dominantColor: analysis.dominantColor,
          colorSpace: analysis.colorSpace,
          mood: analysis.mood,
          category: analysis.category
        });
      } catch {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            dataUrl: e.target?.result as string,
            aspect,
            width: naturalWidth,
            height: naturalHeight,
            dominantColor: '#6b7a82',
            colorSpace: 'cool-cyan',
            mood: 'cinematic-noir',
            category: 'cinematic-landscape'
          });
        };
        reader.readAsDataURL(file);
      }
    };

    img.src = objectUrl;
  });
}
