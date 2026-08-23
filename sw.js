// Service worker de Geronimo — red fresca
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ self.clients.claim(); });
self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET'){
    e.respondWith(fetch(e.request).catch(function(){return new Response('Sin conexion.',{headers:{'Content-Type':'text/plain; charset=utf-8'}});}));
    return;
  }
  e.respondWith(fetch(e.request).catch(function(){
    return new Response('Sin conexion. Geronimo necesita internet para sincronizar con Supabase.',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }));
});
