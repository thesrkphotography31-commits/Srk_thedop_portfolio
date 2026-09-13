// Video Storage Engine for Local/Uploaded Media Files
const DB_NAME = 'srk_photography_portfolio_db';
const DB_VERSION = 1;
const STORE_NAME = 'portfolio_stills';

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

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open database'));
  });
}

// Memory cache of generated blob URLs to avoid duplicate createObjectURL calls
const activeBlobUrls: Map<string, string> = new Map();

/**
 * Save a video file/blob for a project in IndexedDB
 */
export async function saveProjectVideoFile(projectId: string, file: File | Blob): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const key = `video_file_${projectId}`;
    const req = store.put(file, key);

    req.onsuccess = () => {
      // Revoke old blob URL if any
      const existingUrl = activeBlobUrls.get(projectId);
      if (existingUrl) {
        URL.revokeObjectURL(existingUrl);
      }
      const newUrl = URL.createObjectURL(file);
      activeBlobUrls.set(projectId, newUrl);
      resolve(newUrl);
    };

    req.onerror = () => reject(req.error || new Error('Failed to store video file'));
  });
}

/**
 * Get the stored video object URL for a project from IndexedDB
 */
export async function getProjectVideoUrl(projectId: string): Promise<string | null> {
  if (activeBlobUrls.has(projectId)) {
    return activeBlobUrls.get(projectId)!;
  }

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const key = `video_file_${projectId}`;
      const req = store.get(key);

      req.onsuccess = () => {
        if (req.result && (req.result instanceof Blob || req.result instanceof File)) {
          const url = URL.createObjectURL(req.result);
          activeBlobUrls.set(projectId, url);
          resolve(url);
        } else {
          resolve(null);
        }
      };

      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Remove stored video file for a project
 */
export async function removeProjectVideoFile(projectId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(`video_file_${projectId}`);
    const existingUrl = activeBlobUrls.get(projectId);
    if (existingUrl) {
      URL.revokeObjectURL(existingUrl);
      activeBlobUrls.delete(projectId);
    }
  } catch {
    // Ignore errors on removal
  }
}
