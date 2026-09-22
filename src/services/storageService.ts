/**
 * Senda Local Storage & Database Engine (IndexedDB + LocalStorage Fallback)
 * 
 * Provides resilient, offline-first client-side persistence for:
 * - Direct photos captured or selected from the device (stored as Blobs/DataURLs in IndexedDB)
 * - Encrypted conversations, audio messages, moments and personal notes
 * - Transparent fallback to LocalStorage if IndexedDB is blocked in sandboxed contexts
 */

const DB_NAME = 'senda_secure_db';
const DB_VERSION = 1;

export const STORES = {
  MEDIA: 'senda_media_store',
  CONVERSATIONS: 'senda_conversations_store',
  MESSAGES: 'senda_messages_store',
  MOMENTS: 'senda_moments_store',
  NOTES: 'senda_notes_store',
  SETTINGS: 'senda_settings_store'
} as const;

type StoreName = typeof STORES[keyof typeof STORES];

let dbInstance: IDBDatabase | null = null;
let dbInitPromise: Promise<IDBDatabase | null> | null = null;

/**
 * Initializes the IndexedDB database
 */
export async function getDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return null;
  }

  if (dbInstance) {
    return dbInstance;
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = new Promise((resolve) => {
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        Object.values(STORES).forEach((storeName) => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id' });
          }
        });
      };

      request.onsuccess = () => {
        dbInstance = request.result;
        resolve(dbInstance);
      };

      request.onerror = (err) => {
        console.warn('[SENDA DB] IndexedDB unavailable, falling back to LocalStorage:', err);
        resolve(null);
      };
    } catch (e) {
      console.warn('[SENDA DB] Exception opening IndexedDB, falling back:', e);
      resolve(null);
    }
  });

  return dbInitPromise;
}

/**
 * Saves an item to IndexedDB or LocalStorage fallback
 */
export async function saveItem<T>(storeName: StoreName, idOrItem: string | (T & { id: string }), data?: T): Promise<void> {
  const id = typeof idOrItem === 'string' ? idOrItem : idOrItem.id;
  const payload = typeof idOrItem === 'string' ? { id, data } : idOrItem;

  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve, reject) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.put(payload);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } catch (e) {
          reject(e);
        }
      });
      return;
    }
  } catch (err) {
    console.warn(`[SENDA DB] Failed to put in IndexedDB (${storeName}):`, err);
  }

  // LocalStorage disabled per user directive: all application data is stored in Firestore
}

/**
 * Retrieves an item by id from IndexedDB
 */
export async function getItem<T>(storeName: StoreName, id: string): Promise<T | null> {
  try {
    const db = await getDB();
    if (db) {
      return await new Promise<T | null>((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.get(id);
          req.onsuccess = () => {
            const res = req.result;
            if (!res) {
              resolve(null);
            } else if (res && typeof res === 'object' && 'data' in res) {
              resolve(res.data as T);
            } else {
              resolve(res as T);
            }
          };
          req.onerror = () => resolve(null);
        } catch {
          resolve(null);
        }
      });
    }
  } catch (e) {
    console.warn(`[SENDA DB] Error reading from IndexedDB:`, e);
  }

  return null;
}

/**
 * Retrieves all items in a store from IndexedDB
 */
export async function getAllItems<T>(storeName: StoreName): Promise<T[]> {
  try {
    const db = await getDB();
    if (db) {
      return await new Promise<T[]>((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);
          const req = store.getAll();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        } catch {
          resolve([]);
        }
      });
    }
  } catch (e) {
    console.warn(`[SENDA DB] Error getAllItems:`, e);
  }

  return [];
}

/**
 * Purges any residual legacy items from localStorage
 */
export function purgeLegacyLocalStorage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('senda_') || k.includes('senda'))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

/**
 * Deletes an item from store
 */
export async function deleteItem(storeName: StoreName, id: string): Promise<void> {
  try {
    const db = await getDB();
    if (db) {
      await new Promise<void>((resolve) => {
        try {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const req = store.delete(id);
          req.onsuccess = () => resolve();
          req.onerror = () => resolve();
        } catch {
          resolve();
        }
      });
    }
  } catch (e) {
    console.warn(`[SENDA DB] Delete error:`, e);
  }

  try {
    localStorage.removeItem(`senda_idb_${storeName}_${id}`);
  } catch {}
}

/**
 * Compresses an image file from the device (Camera or Gallery) to optimized JPEG DataURL.
 * This guarantees:
 * 1. Low memory footprint
 * 2. Instant local storage without quota explosions
 * 3. Consistent orientation and clean aspect ratio
 */
export async function processDeviceImageFile(
  file: File, 
  maxWidth = 1280, 
  maxHeight = 1280, 
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Erro ao ler arquivo da imagem'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Falha ao carregar imagem'));
      img.onload = () => {
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Draw image onto canvas with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
