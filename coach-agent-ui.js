/*
 * Coach Agent V1 UI bridge.
 *
 * This module is intentionally framework-free so it can be mounted in the
 * existing monolithic AppVucs index without rewriting the application.
 * It exposes window.AppVucsCoach.run(snapshot) and renders a lightweight
 * intelligence panel when requested.
 */
(function(){
  'use strict';
  function esc(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c];});}
  function ensure(){
    if(document.getElementById('coach-agent-panel'))return document.getElementById('coach-agent-panel');
    var p=document.createElement('section');p.id='coach-agent-panel';
    p.style.cssText='position:fixed;right:20px;bottom:20px;width:min(680px,calc(100vw - 40px));max-height:78vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 18px 60px rgba(0,0,0,.25);z-index:99999;padding:22px;font-family:Arial,sans-serif;display:none';
    p.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><div style="font-size:12px;letter-spacing:.08em;color:#64748b">CENTRO DE INTELIGENCIA</div><h2 style="margin:4px 0 0;color:#141B4D">🧠 Coach Estratégico V1</h2></div><button id="coach-agent-close" style="border:0;background:#eef2f7;border-radius:10px;padding:8px 12px;cursor:pointer">Cerrar</button></div><div id="coach-agent-status" style="margin-top:16px;color:#64748b">Listo para analizar.</div><div id="coach-agent-result" style="margin-top:16px;white-space:pre-wrap;line-height:1.55"></div>';
    document.body.appendChild(p);document.getElementById('coach-agent-close').onclick=function(){p.style.display='none'};return p;
  }
  async function run(snapshot){
    var panel=ensure(),status=document.getElementById('coach-agent-status'),result=document.getElementById('coach-agent-result');
    panel.style.display='block';status.textContent='Analizando indicadores...';result.textContent='';
    try{
      var r=await fetch('/api/coach-snapshot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(snapshot||{})});
      var data=await r.json();if(!r.ok||!data.ok)throw new Error(data.error||'No fue posible ejecutar el agente');
      status.innerHTML='<strong>Estado:</strong> análisis generado · '+esc(data.generatedAt||'');
      result.textContent=data.analysis||'Sin análisis';
      return data;
    }catch(e){status.textContent='Error ejecutando el agente';result.textContent=e.message;throw e;}
  }
  window.AppVucsCoach={run:run,open:ensure};
})();
