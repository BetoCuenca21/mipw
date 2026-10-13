const CACHE_NAME = 'dulceria-pwa-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './manifest.json',
  './icons/Icono.png',
  './icons/Icono2.png'
];

// ==========================================
// 1. Instalación: Almacenar recursos estáticos en la caché
// ==========================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Almacenando recursos en caché...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// ==========================================
// 2. Activación: Limpiar cachés antiguas
// ==========================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Borrando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==========================================
// 3. Estrategia Cache First (Offline First)
// ==========================================
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        console.log('[Service Worker] Sin conexión y recurso no encontrado en caché:', event.request.url);
      });
    })
  );
});

// ==========================================
// 4. Background Sync (Evento SYNC)
// ==========================================
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pedidos') {
    console.log('[Service Worker] Ejecutando sincronización de pedidos en segundo plano...');
    event.waitUntil(sincronizarPedidosPendientes());
  }
});

// Función para procesar y avisar la sincronización
async function sincronizarPedidosPendientes() {
  try {
    console.log('[Service Worker] Sincronizando datos pendientes con el servidor...');

    // 1. Notificación push/sistema
    if (self.registration.showNotification) {
      self.registration.showNotification('¡Sincronización Completa!', {
        body: 'Tus datos pendientes en Dulces Los Compas se han registrado correctamente.',
        icon: './icons/Icono.png',
        badge: './icons/Icono.png'
      });
    }

    // 2. Notificación en vivo a la pantalla (Envía un mensaje a app.js para mostrar el Toast)
    const allClients = await self.clients.matchAll({ includeUncontrolled: true });
    for (const client of allClients) {
      client.postMessage({
        action: 'pedidos-sincronizados'
      });
    }

  } catch (error) {
    console.error('[Service Worker] Error al sincronizar:', error);
  }
}