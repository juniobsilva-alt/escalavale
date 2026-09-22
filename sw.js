// Service Worker para EscalaVale (PWA Offline)
const CACHE_NAME = 'escalavale-v1.8';

const RECURSOS_ESTATICOS = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/store.js',
  './js/utils.js',
  './js/nuvem.js',
  './js/views/auth.js',
  './js/views/dashboard.js',
  './js/views/disponibilidade.js',
  './js/views/escala.js',
  './js/views/horarios.js',
  './js/views/mediuns.js',
  './js/views/trabalhos.js',
  './js/views/usuarios.js',
  './js/views/consulta.js',
  './manifest.webmanifest',
  './icons/icone-64.png',
  './icons/icone-192.png',
  './icons/icone-512.png',
  './icons/favicon.ico',
];

// Instalação: pré-carrega os arquivos estáticos essenciais
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(RECURSOS_ESTATICOS).catch((err) => {
        console.warn('Falha no pre-cache de alguns recursos:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Ativação: remove caches de versões antigas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((chaves) => {
      return Promise.all(
        chaves.map((chave) => {
          if (chave !== CACHE_NAME) {
            return caches.delete(chave);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Requisições: Stale-While-Revalidate para assets locais
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Ignora chamadas para APIs externas (ex: Supabase, CDNs externos com query dinâmica)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Requisições não-GET (POST, PUT, DELETE) não são cacheadas
  if (e.request.method !== 'GET') {
    return;
  }

  e.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const respostaCache = await cache.match(e.request);

      const fetchPromise = fetch(e.request).then((respostaRede) => {
        if (respostaRede && respostaRede.status === 200) {
          cache.put(e.request, respostaRede.clone());
        }
        return respostaRede;
      }).catch(() => {
        // Modo offline sem resposta de rede: se houver em cache, usa
        return respostaCache;
      });

      // Retorna do cache se já existir (Stale-While-Revalidate), ou aguarda a rede
      return respostaCache || fetchPromise;
    })
  );
});
