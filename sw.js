// Service worker de Geronimo — minimo, sin cache agresivo
// Los datos siempre vienen frescos de Supabase y la app se actualiza con cada commit
self.addEventListener('install', function(e) { self.skipWaiting(); });
self.addEventListener('activate', function(e) { self.clients.claim(); });
self.addEventListener('fetch', function(e) {
  // Passthrough: red primero, siempre datos frescos
  e.respondWith(fetch(e.request).catch(function() {
    return new Response('Sin conexion. Geronimo necesita internet para sincronizar con Supabase.',
      { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }));
});
