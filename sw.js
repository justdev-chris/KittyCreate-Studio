// ----------------------------------------------
// SW.JS – Service Worker for PWA
// KittyCreate Studio v1 (GitHub Pages)
// ----------------------------------------------

const CACHE_NAME = 'kittycreate-v1';
const REPO_PATH = '/KittyCreate-Studio/';

const ASSETS = [
    REPO_PATH,
    REPO_PATH + 'index.html',
    REPO_PATH + 'manifest.json',
    REPO_PATH + 'css/main.css',
    REPO_PATH + 'css/theme.css',
    REPO_PATH + 'src/core/app.js',
    REPO_PATH + 'src/core/canvas.js',
    REPO_PATH + 'src/core/layers.js',
    REPO_PATH + 'src/core/history.js',
    REPO_PATH + 'src/tools/tools.js',
    REPO_PATH + 'src/tools/brushEngine.js',
    REPO_PATH + 'src/tools/selections.js',
    REPO_PATH + 'src/tools/text.js',
    REPO_PATH + 'src/filters/filters.js',
    REPO_PATH + 'src/animation/animation.js',
    REPO_PATH + 'src/io/export.js',
    REPO_PATH + 'src/io/autosave.js',
    REPO_PATH + 'src/utils/utils.js',
];

// ----- Install -----
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('🐱 KittyCreate Studio: Caching assets...');
                return cache.addAll(ASSETS);
            })
            .then(() => self.skipWaiting())
            .catch((err) => console.warn('Cache failed:', err))
    );
});

// ----- Activate -----
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

// ----- Fetch -----
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip cross-origin and non-GET requests
    if (event.request.method !== 'GET' ||
        !event.request.url.startsWith(self.location.origin)) {
        return;
    }

    // Check if request is for our repo path
    if (!url.pathname.startsWith(REPO_PATH)) {
        // Still try to serve, but don't cache aggressively
        return fetch(event.request);
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
                        // Offline fallback for HTML
                        if (url.pathname === REPO_PATH || url.pathname === REPO_PATH + 'index.html') {
                            return caches.match(REPO_PATH + 'index.html');
                        }
                        return new Response(
                            '🐱 KittyCreate Studio is offline. Please reconnect.',
                            { status: 503, statusText: 'Service Unavailable' }
                        );
                    });
            })
    );
});

// ----- Message -----
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

console.log('🐱 KittyCreate Studio Service Worker loaded (repo: ' + REPO_PATH + ')');