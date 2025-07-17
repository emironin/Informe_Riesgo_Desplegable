// Define un nombre para el caché actual. Cámbialo si actualizas los archivos.
const CACHE_NAME = 'informe-riesgo-cache-v1'; // Puedes cambiar a v2, v3, etc., cada vez que hagas cambios significativos

// Lista de archivos que se guardarán en el caché para que la app funcione sin conexión.
// **IMPORTANTE: Solo incluye tus propios archivos aquí.**
// Las URLs de CDN como Tailwind, jsPDF, html2canvas, y Google Fonts no se deben cachear directamente aquí.
const urlsToCache = [
  './', // Esto es la raíz de tu aplicación
  './index.html'
  // Si tienes CSS o JS propios (que no sean CDN) que quieras cachear, agrégalos aquí:
  // './styles.css',
  // './app.js', (si tuvieras otro archivo JS aparte del de index.html)
];

// Evento 'install': Se activa cuando el Service Worker se instala por primera vez.
// Aquí cacheamos los archivos estáticos.
self.addEventListener('install', event => {
  console.log('[Service Worker] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache abierto, añadiendo URLs:', urlsToCache);
        return cache.addAll(urlsToCache)
          .catch(error => {
            console.error('[Service Worker] Error al cachear archivos durante la instalación:', error);
            // Si hay un error al cachear, el Service Worker no se activará correctamente.
            // Para depuración, es útil ver este error.
          });
      })
      .then(() => self.skipWaiting()) // Fuerza la activación del nuevo SW inmediatamente
      .catch(error => {
        console.error('[Service Worker] Error general durante la instalación:', error);
      })
  );
});

// Evento 'fetch': Se activa cada vez que el navegador hace una petición de red.
// Intentamos servir los recursos desde el caché primero, luego desde la red.
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si encontramos una respuesta en el caché, la devolvemos.
        if (response) {
          console.log(`[Service Worker] Sirviendo desde caché: ${event.request.url}`);
          return response;
        }

        // Si no está en caché, intentamos obtenerla de la red.
        console.log(`[Service Worker] Obteniendo de la red: ${event.request.url}`);
        return fetch(event.request)
          .then(networkResponse => {
            // Clonamos la respuesta porque una respuesta de red solo puede ser leída una vez.
            const responseToCache = networkResponse.clone();

            // Si es una respuesta válida, la guardamos en caché para futuras peticiones.
            if (networkResponse.ok) { // Solo cachear respuestas exitosas (código 200)
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(event.request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch(error => {
            console.error(`[Service Worker] Fetch fallido para: ${event.request.url}`, error);
            // Aquí puedes añadir lógica para servir una página offline si la red falla
            // Por ejemplo: return caches.match('/offline.html');
          });
      })
  );
});

// Evento 'activate': Se activa cuando el Service Worker se activa.
// Aquí limpiamos los cachés viejos.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Activando Service Worker...');
  const cacheWhitelist = [CACHE_NAME]; // Solo mantenemos el caché actual
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`[Service Worker] Eliminando caché antiguo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Permite que el nuevo SW tome el control de las páginas existentes
  );
});
