// Progressive Web App Service Worker with Offline Media Storage & IndexedDB Fallback
const CACHE_NAME = 'wardrobe-pwa-v2';
const IDB_NAME = 'wardrobe_media_cache_v1';
const IDB_STORE = 'image_blobs';

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-192-maskable.png',
  '/icon-512.png',
  '/icon-512-maskable.png',
  '/apple-touch-icon.png',
  '/icon.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.warn('[SW] Precache partial error:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

/**
 * Reads a binary Blob from IndexedDB under any matching key permutation.
 */
function getBlobFromIDB(key) {
  return new Promise((resolve) => {
    if (!self.indexedDB) return resolve(null);
    try {
      const openReq = indexedDB.open(IDB_NAME);
      openReq.onerror = () => resolve(null);
      openReq.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.close();
          return resolve(null);
        }
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);
        req.onsuccess = () => {
          db.close();
          resolve(req.result || null);
        };
        req.onerror = () => {
          db.close();
          resolve(null);
        };
      };
    } catch {
      resolve(null);
    }
  });
}

/**
 * Searches IndexedDB for an upload photo under all possible key formats.
 */
async function findPhotoInIDB(urlStr) {
  try {
    const url = new URL(urlStr);
    const pathname = decodeURIComponent(url.pathname);
    const cleanSub = pathname.replace(/^\/+/, '').replace(/^uploads\//, '');
    const basename = pathname.split('/').pop() || '';
    const strippedBase = basename.replace(/^\d+_/, '');

    const candidateKeys = [
      urlStr,
      pathname,
      cleanSub,
      `/uploads/${cleanSub}`,
      `photos/${cleanSub}`,
      `/uploads/photos/${cleanSub}`,
      basename,
      `/uploads/${basename}`,
      strippedBase,
      `/uploads/${strippedBase}`
    ];

    for (const k of candidateKeys) {
      if (!k) continue;
      const val = await getBlobFromIDB(k);
      if (val && (val instanceof Blob || val instanceof ArrayBuffer)) {
        return val instanceof Blob ? val : new Blob([val], { type: 'image/jpeg' });
      }
    }
  } catch {}
  return null;
}

self.addEventListener('fetch', (event) => {
  // Only handle GET requests and http/https schemes
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  // Bypass dynamic backend API endpoints to network
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Special handling for /uploads/* photos: Offline-First with IndexedDB fallback
  if (event.request.url.includes('/uploads/')) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedRes = await cache.match(event.request);
        if (cachedRes) {
          return cachedRes;
        }

        // Check IndexedDB
        const idbBlob = await findPhotoInIDB(event.request.url);
        if (idbBlob) {
          const res = new Response(idbBlob, {
            status: 200,
            headers: {
              'Content-Type': idbBlob.type || 'image/jpeg',
              'Cache-Control': 'public, max-age=31536000, immutable'
            }
          });
          cache.put(event.request, res.clone()).catch(() => {});
          return res;
        }

        // Try network
        try {
          const networkRes = await fetch(event.request);
          if (networkRes && networkRes.status === 200) {
            cache.put(event.request, networkRes.clone()).catch(() => {});
            return networkRes;
          }
        } catch {}

        // Secondary check of IndexedDB in case it was written mid-flight
        const retryBlob = await findPhotoInIDB(event.request.url);
        if (retryBlob) {
          return new Response(retryBlob, {
            status: 200,
            headers: { 'Content-Type': retryBlob.type || 'image/jpeg' }
          });
        }

        return new Response('Image not found', { status: 404 });
      })()
    );
    return;
  }

  // Standard static assets & navigation handling
  event.respondWith(
    (async () => {
      // 1. Navigation requests: Network-first, fallback to cached index.html
      if (event.request.mode === 'navigate') {
        try {
          const networkRes = await fetch(event.request);
          if (networkRes && networkRes.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkRes.clone()).catch(() => {});
            return networkRes;
          }
        } catch {}
        const cachedHtml = await caches.match('/index.html');
        if (cachedHtml) return cachedHtml;
      }

      // 2. Static assets: Cache-first with background revalidation
      const cached = await caches.match(event.request);
      if (cached) {
        fetch(event.request).then(async (netRes) => {
          if (netRes && netRes.status === 200) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, netRes).catch(() => {});
          }
        }).catch(() => {});
        return cached;
      }

      try {
        const netRes = await fetch(event.request);
        if (netRes && netRes.status === 200 && netRes.type === 'basic') {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, netRes.clone()).catch(() => {});
        }
        return netRes;
      } catch {
        if (event.request.mode === 'navigate') {
          return (await caches.match('/index.html')) || Response.error();
        }
        return Response.error();
      }
    })()
  );
});
