/* Coach Estratégico V1 — bridge + live AppVucs snapshot. */
(function(){
  'use strict';
  var esc=function(v){return String(v==null?'':v).replace(/[&<>\"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c];});};
  function ensure(){
    if(document.getElementById('coach-agent-panel'))return document.getElementById('coach-agent-panel');
    var p=document.createElement('section');p.id='coach-agent-panel';
    p.style.cssText='position:fixed;right:20px;bottom:20px;width:min(720px,calc(100vw - 40px));max-height:82vh;overflow:auto;background:#fff;border-radius:18px;box-shadow:0 18px 60px rgba(0,0,0,.25);z-index:99999;padding:22px;font-family:Arial,sans-serif;display:none';
    p.innerHTML='<div style="display:flex;justify-content:space-between;align-items:center;gap:12px"><div><div style="font-size:12px;letter-spacing:.08em;color:#64748b">CENTRO DE INTELIGENCIA</div><h2 style="margin:4px 0 0;color:#141B4D">🧠 Coach Estratégico V1</h2></div><button id="coach-agent-close" style="border:0;background:#eef2f7;border-radius:10px;padding:8px 12px;cursor:pointer">Cerrar</button></div><div id="coach-agent-status" style="margin-top:16px;color:#64748b">Listo para analizar.</div><div id="coach-agent-result" style="margin-top:16px;white-space:pre-wrap;line-height:1.55"></div>';
    document.body.appendChild(p);document.getElementById('coach-agent-close').onclick=function(){p.style.display='none'};return p;
  }
  async function supa(table,query){
    if(!window.sb||!window.sb._url||!window._supaHeaders)throw new Error('AppVucs aún no ha inicializado la conexión de datos. Espera unos segundos y vuelve a intentar.');
    var r=await fetch(window.sb._url+'/rest/v1/'+table+'?'+query,{headers:window._supaHeaders});
    if(!r.ok)throw new Error('No se pudo leer '+table+' desde Supabase ('+r.status+')');
    return r.json();
  }
  function sum(rows,key){return rows.reduce(function(a,r){var n=Number(r[key]);return a+(Number.isFinite(n)?n:0);},0);}
  function pct(a,b){return b?Math.round((a/b)*10000)/100:null;}
  function currentMonthKey(){var d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
  async function buildLiveSnapshot(){
    var mes=currentMonthKey();
    var registros=await supa('registros','select=*&mes=eq.'+encodeURIComponent(mes)+'&limit=10000');
    var metas=await supa('metas','select=*&mes=eq.'+encodeURIComponent(mes)+'&limit=1000');
    var sales=sum(registros,'cierres');
    var target=sum(metas,'meta');
    var prospects=sum(registros,'vcampana')+sum(registros,'vreferido')+sum(registros,'vrmk');
    var followups=sum(registros,'seguimientos');
    var days=[...new Set(registros.map(function(r){return String(r.semana)+'-'+String(r.dia);})).values()].length;
    var pace=days?sales/days:null;
    var achievement=pct(sales,target);
    var advisors={};
    registros.forEach(function(r){var n=r.asesor||'Sin asesor';if(!advisors[n])advisors[n]={name:n,rows:[],sales:0,activity:0,prospects:0};var a=advisors[n];a.rows.push(r);a.sales+=Number(r.cierres)||0;a.activity+=(Number(r.mensajes)||0)+(Number(r.seguimientos)||0);a.prospects+=(Number(r.vcampana)||0)+(Number(r.vreferido)||0)+(Number(r.vrmk)||0);});
    var advisorList=Object.keys(advisors).map(function(n){var a=advisors[n];var m=metas.find(function(x){return String(x.asesor)===String(n);});return {name:a.name,sales:a.sales,target:m?Number(m.meta)||0:null,achievementPct:pct(a.sales,m?Number(m.meta)||0:0),activity:a.activity,conversionPct:pct(a.sales,a.prospects)};});
    var daysInMonth=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
    var projected=pace!==null?Math.round(pace*daysInMonth*100)/100:null;
    return {date:new Date().toISOString().slice(0,10),company:{sales:sales,target:target,achievementPct:achievement,currentDailyPace:pace,requiredDailyPace:null,variationVsPreviousPeriodPct:null},funnel:{prospects:prospects,contacts:null,followups:followups,procedures:null,sales:sales,prospectToSalePct:pct(sales,prospects),followupToSalePct:null},forecast:{projectedSales:projected,projectedAchievementPct:pct(projected,target),gapToTarget:projected===null||target===null?null:projected-target},advisors:advisorList,alerts:[],previousAnalysis:null};
  }
  async function run(snapshot){
    var panel=ensure(),status=document.getElementById('coach-agent-status'),result=document.getElementById('coach-agent-result');
    panel.style.display='block';status.textContent='Leyendo indicadores reales de AppVucs...';result.textContent='';
    try{
      var live=snapshot||await buildLiveSnapshot();
      status.textContent='Analizando operación comercial...';
      var r=await fetch('/api/coach-snapshot',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(live)});
      var data=await r.json();if(!r.ok||!data.ok)throw new Error(data.error||'No fue posible ejecutar el agente');
      status.innerHTML='<strong>Estado:</strong> análisis generado · '+esc(data.generatedAt||'')+' · '+esc(live.date);
      result.textContent=data.analysis||'Sin análisis';
      return data;
    }catch(e){status.textContent='Error ejecutando el agente';result.textContent=e.message;throw e;}
  }
  function mountButton(){
    if(document.getElementById('coach-agent-launch'))return;
    var b=document.createElement('button');b.id='coach-agent-launch';b.textContent='🧠 Coach Estratégico';
    b.style.cssText='position:fixed;right:20px;bottom:20px;z-index:99998;border:0;border-radius:14px;padding:12px 16px;background:#141B4D;color:#fff;font-weight:700;box-shadow:0 8px 24px rgba(0,0,0,.2);cursor:pointer';
    b.onclick=function(){run();};document.body.appendChild(b);
  }
  window.AppVucsCoach={run:run,open:ensure,buildSnapshot:buildLiveSnapshot};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',function(){setTimeout(mountButton,1200);});else setTimeout(mountButton,1200);
})();
