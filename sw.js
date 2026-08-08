const CACHE_NAME = 'portal-oppo-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
    console.log('[Service Worker] Instalado com sucesso!');
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(cacheNames.map((cache) => {
                if (cache !== CACHE_NAME) return caches.delete(cache);
            }));
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    if (event.request.url.includes('script.google.com') || event.request.url.includes('supabase.co')) {
        return;
    }
    event.respondWith(
        fetch(event.request).then((response) => {
            if (response && response.status === 200 && response.type === 'basic') {
                let responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
            }
            return response;
        }).catch(() => caches.match(event.request))
    );
});