// AppVucs -> Coach Strategic Agent adapter.
// Accepts KPI snapshots from the AppVucs frontend, validates/normalizes them,
// then forwards them to the Coach Agent. Origin protection mirrors api/ia.js.
// Cubre produccion (appvucs.vercel.app), CUALQUIER preview de rama
// (appvucs-git-....vercel.app) y localhost para pruebas.
const DOMINIOS_PERMITIDOS=['.vercel.app','localhost'];
function n(v){const x=Number(v);return Number.isFinite(x)?x:null;}
function p(v){const x=n(v);return x===null?null:Math.round(x*100)/100;}
function normalize(body){
  const d=body||{},c=d.company||{},f=d.funnel||{},fc=d.forecast||{},advisors=Array.isArray(d.advisors)?d.advisors:[];
  const dl=d.daily||{};return {date:d.date||new Date().toISOString().slice(0,10),company:{sales:n(c.sales),target:n(c.target),achievementPct:p(c.achievementPct),requiredDailyPace:n(c.requiredDailyPace),currentDailyPace:n(c.currentDailyPace),variationVsPreviousPeriodPct:p(c.variationVsPreviousPeriodPct)},funnel:{prospects:n(f.prospects),contacts:n(f.contacts),followups:n(f.followups),procedures:n(f.procedures),sales:n(f.sales),prospectToSalePct:p(f.prospectToSalePct),followupToSalePct:p(f.followupToSalePct)},forecast:{projectedSales:n(fc.projectedSales),projectedAchievementPct:p(fc.projectedAchievementPct),gapToTarget:n(fc.gapToTarget)},advisors:advisors.map(a=>({name:a.name||a.asesor||null,sales:n(a.sales),target:n(a.target),achievementPct:p(a.achievementPct),activity:n(a.activity),activityVariationPct:p(a.activityVariationPct),conversionPct:p(a.conversionPct),conversionVariationPct:p(a.conversionVariationPct),forecastPct:p(a.forecastPct)})),daily:{label:dl.label||null,sales:n(dl.sales),activity:n(dl.activity),requiredDailyPace:n(dl.requiredDailyPace),achievementPct:p(dl.achievementPct)},alerts:Array.isArray(d.alerts)?d.alerts.slice(0,20):[],previousAnalysis:d.previousAnalysis||null};
}
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
  const origin=req.headers.origin||req.headers.referer||'';
  if(!DOMINIOS_PERMITIDOS.some(d=>origin.includes(d)))return res.status(403).json({ok:false,error:'Acceso no autorizado'});
  try{
    const snapshot=normalize(req.body);
    const host=req.headers.host;
    const proto=req.headers['x-forwarded-proto']||'https';
    const r=await fetch(`${proto}://${host}/api/coach-agent`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({data:snapshot})});
    const result=await r.json();
    return res.status(r.status).json(result);
  }catch(e){console.error('coach-snapshot error',e);return res.status(500).json({ok:false,error:e.message||'Snapshot error'});}
}
