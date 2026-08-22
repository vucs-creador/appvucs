// Service worker de Geronimo — red fresca + inyección controlada del Coach V1
self.addEventListener('install', function(e){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ self.clients.claim(); });
self.addEventListener('fetch', function(e){
  if(e.request.method!=='GET'){
    e.respondWith(fetch(e.request).catch(function(){return new Response('Sin conexion.',{headers:{'Content-Type':'text/plain; charset=utf-8'}});}));
    return;
  }
  e.respondWith(fetch(e.request).then(async function(response){
    var url=new URL(e.request.url);
    var isDocument=e.request.mode==='navigate'||(e.request.destination==='document');
    if(!isDocument || url.pathname!=='/') return response;
    try{
      var html=await response.text();
      if(html.indexOf('/coach-agent-ui.js')===-1){
        html=html.replace('</body>','<script src="/coach-agent-ui.js"></script></body>');
      }
      return new Response(html,{status:response.status,statusText:response.statusText,headers:response.headers});
    }catch(err){return response;}
  }).catch(function(){
    return new Response('Sin conexion. Geronimo necesita internet para sincronizar con Supabase.',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
  }));
});
