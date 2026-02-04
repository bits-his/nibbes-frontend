// Nibbles Service Worker - Version 3.0.3
// OPTIMIZED FOR OFFLINE SUPPORT AND PERFORMANCE

const VERSION = '3.0.3';
const CACHE_NAME = `nibbles-kitchen-v${VERSION}`;
const RUNTIME_CACHE = `nibbles-runtime-v${VERSION}`;

// ============================================================================
// Assets to precache on install
// NOTE: Do NOT include index.html here - it must always be fresh from network
// ============================================================================
const PRECACHE_URLS = [
  '/manifest.json',
  '/nibbles.jpg',
  '/offline.html'
];  

// ============================================================================
// INSTALL: Cache essential assets and activate immediately
// ============================================================================
self.addEventListener('install', (event) => {
  console.log(`[Service Worker v${VERSION}] Installing...`);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Precaching assets');
        return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('[Service Worker] Calling skipWaiting()');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[Service Worker] Precaching failed:', error);
      })
  );
});

// ============================================================================
// ACTIVATE: Clean up old caches and take control immediately
// ============================================================================
self.addEventListener('activate', (event) => {
  console.log(`[Service Worker v${VERSION}] Activating...`);

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete ALL old caches (different version)
              const isOldCache = cacheName.startsWith('nibbles-') && 
                                cacheName !== CACHE_NAME && 
                                cacheName !== RUNTIME_CACHE;
              if (isOldCache) {
                console.log('[Service Worker] Deleting old cache:', cacheName);
              }
              return isOldCache;
            })
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// ============================================================================
// FETCH: Network-first for HTML, cache-first for assets
// ============================================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip WebSocket connections
  if (url.pathname.startsWith('/ws')) {
    return;
  }

  // -------------------------------------------------------------------------
  // Strategy 1: NETWORK-FIRST for Menu API (always fresh data)
  // -------------------------------------------------------------------------
  if (url.pathname === '/api/menu/all' || url.pathname.includes('/api/menu/')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          // Don't cache menu API - always fetch fresh to get latest image URLs
          return networkResponse;
        })
        .catch(() => {
          // Network failed, try cache as fallback
          return caches.match(request).then((cachedResponse) => {
            return cachedResponse || new Response(
              JSON.stringify({ error: 'Network unavailable' }),
              { status: 503, headers: { 'Content-Type': 'application/json' } }
            );
          });
        })
    );
    return;
  }

  // -------------------------------------------------------------------------
  // Strategy 2: CACHE-FIRST for images (including Cloudinary)
  // -------------------------------------------------------------------------
  const isCloudinaryImage = url.hostname.includes('cloudinary.com');
  if (isCloudinaryImage || 
      request.destination === 'image' || 
      url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached image immediately
          // Fetch fresh version in background for next time
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(RUNTIME_CACHE).then((cache) => {
                cache.put(request, responseToCache);
              });
            }
          }).catch(() => {
            // Network failed, that's ok - we have cache
          });
          return cachedResponse;
        }
        
        // Not in cache, fetch from network
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        }).catch(() => {
          // Network failed and no cache - return placeholder
          return new Response(
            '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="#e5e7eb"/></svg>',
            { headers: { 'Content-Type': 'image/svg+xml' } }
          );
        });
      })
    );
    return;
  }

  // -------------------------------------------------------------------------
  // Strategy 3: NETWORK FIRST for HTML (always fresh)
  // -------------------------------------------------------------------------
  if (request.mode === 'navigate' || 
      request.headers.get('accept')?.includes('text/html') ||
      url.pathname === '/' || 
      url.pathname.endsWith('.html')) {
    
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Got fresh HTML from network - don't cache it
          return response;
        })
        .catch(() => {
          // Network failed - try cache, then offline page
          return caches.match(request)
            .then((cachedResponse) => {
              return cachedResponse || caches.match('/offline.html');
            });
        })
    );
    return;
  }

  // -------------------------------------------------------------------------
  // Strategy 4: CACHE FIRST for static assets (CSS, JS, fonts)
  // Use stale-while-revalidate pattern for better performance
  // -------------------------------------------------------------------------
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        // Fetch from network in background to update cache
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            // Cache successful responses (CSS, JS, fonts, etc.)
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              cache.put(request, responseToCache);
            }
            return networkResponse;
          })
          .catch(() => {
            // Network failed - that's ok if we have cache
            return null;
          });

        // Return cached version immediately if available (stale-while-revalidate)
        // Otherwise wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// ============================================================================
// MESSAGE: Handle commands from the client
// ============================================================================
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[Service Worker] SKIP_WAITING requested - activating new version');
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('[Service Worker] CLEAR_CACHE requested');
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('nibbles-'))
            .map((cacheName) => {
              console.log('[Service Worker] Clearing cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
    );
  }
});

// ============================================================================
// BACKGROUND SYNC: For offline orders (future enhancement)
// ============================================================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-orders') {
    console.log('[Service Worker] Syncing offline orders...');
    // Future: Sync offline orders when connection is restored
  }
});

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  let notificationData = {
    title: 'Nibbles Kitchen',
    body: 'New notification from Nibbles',
  };

  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: '/pwa-icons/icon-192x192.png',
    badge: '/pwa-icons/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: notificationData.tag || 'nibbles-notification',
    requireInteraction: true,
    actions: [
      { action: 'view', title: 'View Order' },
      { action: 'close', title: 'Close' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title || 'Nibbles Kitchen', options)
  );
});

// ============================================================================
// NOTIFICATION CLICK: Handle notification interactions
// ============================================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Log version on load
console.log(`[Service Worker v${VERSION}] Script loaded`);
