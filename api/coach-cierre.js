// Cron 11:59pm (hora Colombia) -- cierra el dia: lee los indicadores
// reales de AppVucs, genera el informe del dia y del mes acumulado, y lo
// guarda en coach_reportes. NO lo envia -- eso lo hace coach-informe.js
// a las 7am del dia siguiente.

const SB_URL = 'https://jcddfjsetmgdlafjabdq.supabase.co';
const SUPA_HEADERS = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGRmanNldG1nZGxhZmphYmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTQ2MTksImV4cCI6MjA5NjA5MDYxOX0.NytxezqoeuHKB_6zZM-xO2Tqk3_OqzP0IdYBk7Z2FLE',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZGRmanNldG1nZGxhZmphYmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA1MTQ2MTksImV4cCI6MjA5NjA5MDYxOX0.NytxezqoeuHKB_6zZM-xO2Tqk3_OqzP0IdYBk7Z2FLE',
  'Content-Type': 'application/json'
};
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}
function pct(a,b){if(a==null||b==null||b===0)return null;return Math.round((a/b)*10000)/100;}

async function supa(table,q){
  const r=await fetch(SB_URL+'/rest/v1/'+table+'?'+q,{headers:SUPA_HEADERS});
  if(!r.ok) throw new Error('Supabase no permitio consultar '+table+' ('+r.status+')');
  return r.json();
}

// Misma logica exacta que snapshot() en coach-estrategico.html, portada a
// servidor (sin window). Si un dia cambia una, cambia la otra.
async function snapshot(){
  const hoy=new Date();
  const m=MESES[hoy.getMonth()];
  const registros=await supa('registros','select=*&mes=eq.'+encodeURIComponent(m)+'&limit=10000');
  const metas=await supa('metas','select=*&mes=eq.'+encodeURIComponent(m)+'&limit=1000');

  const nuevos=registros.reduce((s,r)=>s+n(r.vcampana)+n(r.vreferido)+n(r.vrmk),0);
  const reingresos=registros.reduce((s,r)=>s+n(r.reingresos),0);
  const sales=nuevos+reingresos;
  const target=metas.reduce((s,r)=>s+n(r.meta),0);
  const cartera=metas.reduce((s,r)=>s+n(r.cartera),0);
  const renovaciones=registros.reduce((s,r)=>s+n(r.renovaciones),0);

  const mensajes=registros.reduce((s,r)=>s+n(r.mensajes),0);
  const referidos=registros.reduce((s,r)=>s+n(r.referidos),0);
  const remarketing=registros.reduce((s,r)=>s+n(r.remarketing),0);
  const seguimientos=registros.reduce((s,r)=>s+n(r.seguimientos),0);
  const vcampana=registros.reduce((s,r)=>s+n(r.vcampana),0);
  const vreferido=registros.reduce((s,r)=>s+n(r.vreferido),0);
  const vrmk=registros.reduce((s,r)=>s+n(r.vrmk),0);
  const canales=[{canal:'Ventas por campaña',valor:vcampana},{canal:'Reingresos',valor:reingresos},{canal:'Ventas por referido',valor:vreferido},{canal:'Ventas por RMK base de datos',valor:vrmk}];
  const mejorCanal=canales.slice().sort((a,b)=>b.valor-a.valor)[0]||null;

  const dayKeys=[...new Set(registros.map(r=>String(r.semana)+'-'+String(r.dia)))];
  const daysInMonth=new Date(hoy.getFullYear(),hoy.getMonth()+1,0).getDate();
  const requiredDailyPace=daysInMonth?target/daysInMonth:null;
  const pace=dayKeys.length?sales/dayKeys.length:null;
  const projected=pace==null?null:pace*daysInMonth;

  const advisors={};
  registros.forEach(r=>{
    const name=r.asesor||'Sin asesor';
    if(!advisors[name])advisors[name]={name,mensajes:0,referidos:0,remarketing:0,seguimientos:0,vcampana:0,vreferido:0,vrmk:0,reingresos:0,renovaciones:0};
    const a=advisors[name];
    a.mensajes+=n(r.mensajes);a.referidos+=n(r.referidos);a.remarketing+=n(r.remarketing);a.seguimientos+=n(r.seguimientos);
    a.vcampana+=n(r.vcampana);a.vreferido+=n(r.vreferido);a.vrmk+=n(r.vrmk);
    a.reingresos+=n(r.reingresos);a.renovaciones+=n(r.renovaciones);
  });
  const advisorList=Object.values(advisors).map(a=>{
    const meta=metas.find(x=>String(x.asesor)===String(a.name));
    const mt=meta?n(meta.meta):0, cart=meta?n(meta.cartera):0;
    const nv=a.vcampana+a.vreferido+a.vrmk;
    const ventasMeta=nv+a.reingresos;
    const prospeccion=a.mensajes+a.referidos+a.remarketing;
    return {...a,nuevos:nv,ventasVsMeta:ventasMeta,target:mt,achievementPct:pct(ventasMeta,mt),
      cartera:cart,renovacionesPct:pct(a.renovaciones,cart),conversionPct:pct(nv,prospeccion)};
  });

  const diaClave=r=>String(r.semana)+'-'+String(r.dia);
  const diasOrdenados=[...new Set(registros.map(diaClave))].map(k=>{const [s,d]=k.split('-').map(Number);return {s,d,k}}).sort((a,b)=>a.s-b.s||a.d-b.d);
  const ultimoDia=diasOrdenados[diasOrdenados.length-1]||null;
  const registrosDia=ultimoDia?registros.filter(r=>diaClave(r)===ultimoDia.k):[];
  const ventasDia=registrosDia.reduce((s,r)=>s+n(r.vcampana)+n(r.vreferido)+n(r.vrmk)+n(r.reingresos),0);
  const actividadDia=registrosDia.reduce((s,r)=>s+n(r.mensajes)+n(r.seguimientos),0);
  const daily={label:ultimoDia?('Semana '+ultimoDia.s+', dia '+ultimoDia.d):null,sales:ventasDia,activity:actividadDia,requiredDailyPace,achievementPct:pct(ventasDia,requiredDailyPace)};

  return {date:hoy.toISOString().slice(0,10),analysisMonth:m,
    company:{sales,target,achievementPct:pct(sales,target),currentDailyPace:pace,requiredDailyPace,variationVsPreviousPeriodPct:null,nuevos,reingresos,renovaciones,cartera,renovacionesPct:pct(renovaciones,cartera)},
    funnel:{prospects:mensajes+referidos+remarketing,contacts:null,followups:seguimientos,procedures:null,sales,prospectToSalePct:pct(nuevos,mensajes+referidos+remarketing),followupToSalePct:null,canales,mejorCanal},
    forecast:{projectedSales:projected,projectedAchievementPct:pct(projected,target),gapToTarget:projected==null?null:projected-target},
    advisors:advisorList,daily,alerts:[],previousAnalysis:null};
}

export default async function handler(req,res){
  try{
    const data=await snapshot();
    const host=req.headers.host;
    const proto=req.headers['x-forwarded-proto']||'https';
    const r=await fetch(`${proto}://${host}/api/coach-agent`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({data})});
    const out=await r.json();
    if(!r.ok||!out.ok) throw new Error(out.error||'El agente no genero el informe del cierre.');

    const ins=await fetch(SB_URL+'/rest/v1/coach_reportes',{method:'POST',headers:{...SUPA_HEADERS,'Prefer':'return=representation'},
      body:JSON.stringify({fecha:data.date,mes:data.analysisMonth,informe:out.analysis,enviado:false})});
    if(!ins.ok) throw new Error('No se pudo guardar el cierre en Supabase ('+ins.status+').');

    return res.status(200).json({ok:true,fecha:data.date,mes:data.analysisMonth,guardado:true});
  }catch(e){
    console.error('coach-cierre error',e);
    return res.status(500).json({ok:false,error:e.message||'Error en el cierre diario'});
  }
}
