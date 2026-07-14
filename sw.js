// ----------------------------------------------
// SW.JS – Service Worker for KittyCreate Studio
// Fully dynamic – works in any repo subfolder
// ----------------------------------------------

const CACHE_NAME = 'kittycreate-v1';

// ----- Auto-detect base path -----
const getBasePath = () => {
    const swPath = self.location.pathname;
    // swPath = /KittyCreate-Studio/sw.js or /sw.js
    const base = swPath.substring(0, swPath.lastIndexOf('/') + 1);
    return base || '/';
};

const BASE = getBasePath();

// ----- All assets (relative to BASE) -----
const ASSETS = [
    BASE,
    BASE + 'index.html',
    BASE + 'manifest.json',
    BASE + 'css/main.css',
    BASE + 'css/theme.css',
    BASE + 'src/core/app.js',
    BASE + 'src/core/canvas.js',
    BASE + 'src/core/layers.js',
    BASE + 'src/core/history.js',
    BASE + 'src/tools/tools.js',
    BASE + 'src/tools/brushEngine.js',
    BASE + 'src/tools/selections.js',
    BASE + 'src/tools/text.js',
    BASE + 'src/filters/filters.js',
    BASE + 'src/animation/animation.js',
    BASE + 'src/io/export.js',
    BASE + 'src/io/autosave.js',
    BASE + 'src/utils/utils.js',
];

// ----- Install: Cache all assets -----
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('🐱 KittyCreate: Caching ' + ASSETS.length + ' assets...');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('Cache failed:', err))
    );
});

// ----- Activate: Clean old caches -----
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((name) => {
                    if (name !== CACHE_NAME) {
                        console.log('🗑️ Removing old cache:', name);
                        return caches.delete(name);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// ----- Fetch: Cache-first with network fallback -----
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip cross-origin and non-GET
    if (event.request.method !== 'GET' ||
        !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Skip Chrome extensions and devtools
    if (url.pathname.startsWith('/__') || url.pathname.includes('chrome-extension')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cached) => {
                if (cached) {
                    return cached;
                }

                return fetch(event.request)
                    .then((response) => {
                        if (!response || response.status !== 200 ||
                            response.type !== 'basic') {
                            return response;
                        }

                        const clone = response.clone();
                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                try {
                                    cache.put(event.request, clone);
                                } catch (err) {
                                    // Silently fail
                                }
                            });

                        return response;
                    })
                    .catch(() => {
                        // Offline fallback
                        if (url.pathname.endsWith('.html') ||
                            url.pathname === BASE ||
                            url.pathname === BASE + 'index.html') {
                            return caches.match(BASE + 'index.html');
                        }
                        return new Response(
                            '🐱 KittyCreate Studio is offline. Please reconnect.',
                            { status: 503, statusText: 'Service Unavailable' }
                        );
                    });
            })
    );
});

// ----- Message: Skip waiting -----
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('🐱 KittyCreate Studio SW loaded (base: ' + BASE + ')');