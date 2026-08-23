// Service worker de Geronimo — red fresca
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });

async function appResponse(request){
  const response = await fetch(request);
  const url = new URL(request.url);
  const isHtml = request.method === 'GET' && (request.mode === 'navigate' || request.destination === 'document') && response.ok && (response.headers.get('content-type') || '').includes('text/html');
  if(!isHtml || url.pathname.endsWith('/coach-estrategico.html')) return response;

  const html = await response.text();
  const launcher = `
<style id="coach-launcher-style">#appvucs-coach-launcher{position:fixed;right:20px;bottom:20px;z-index:2147483647;border:0;border-radius:999px;padding:14px 18px;background:#141B4D;color:#fff;font:800 14px/1.1 system-ui,-apple-system,Segoe UI,sans-serif;box-shadow:0 10px 28px rgba(20,27,77,.28);cursor:pointer}#appvucs-coach-launcher:hover{transform:translateY(-1px)}@media(max-width:600px){#appvucs-coach-launcher{right:12px;bottom:12px;padding:13px 15px}}</style>
<button id="appvucs-coach-launcher" type="button" onclick="window.open('/coach-estrategico.html','_blank','noopener')">🧠 Coach Estratégico</button>`;
  if(html.includes('</body>')) return new Response(html.replace('</body>', launcher + '</body>'), {status:response.status,statusText:response.statusText,headers:response.headers});
  return response;
}

self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET'){
    e.respondWith(fetch(e.request).catch(function(){return new Response('Sin conexion.',{headers:{'Content-Type':'text/plain; charset=utf-8'}});}));
    return;
  }
  e.respondWith(appResponse(e.request).catch(function(){
    return new Response('Sin conexion. Geronimo necesita internet para sincronizar con Supabase.',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }));
});
