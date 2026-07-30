// NOME DO CACHE (Mude o número da versão sempre que fizer uma grande atualização no futuro, ex: oppo-v3)
const CACHE_NAME = 'oppo-v2-premium'; 

// INSTALAÇÃO: Força o celular a instalar a nova versão imediatamente
self.addEventListener('install', (event) => {
    self.skipWaiting(); 
});

// ATIVAÇÃO: Varre o celular do promotor e deleta qualquer lixo de versão antiga
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deletando cache antigo:', cacheName);
                        return caches.delete(cacheName); 
                    }
                })
            );
        })
    );
    self.clients.claim(); // Assume o controle na mesma hora
});

// INTERCEPTADOR DE REDE (ESTRATÉGIA: NETWORK FIRST / INTERNET PRIMEIRO)
self.addEventListener('fetch', (event) => {
    // Ignora requisições para a API do Google (elas nunca devem ser cacheadas)
    if (event.request.url.includes('script.google.com')) {
        return; 
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Se o celular tem internet, ele baixa o arquivo fresco e atualiza o cache silenciosamente
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Se o promotor está offline no meio da rua, carrega o app usando a memória do cache
                return caches.match(event.request);
            })
    );
});