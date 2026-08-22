const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Eres el Coach Estratégico Comercial de AppVucs.

MISIÓN: vigilar la operación comercial, detectar desviaciones y oportunidades, explicar evidencia, priorizar acciones y hacer seguimiento.

REGLAS:
1. Usa únicamente los datos recibidos. Nunca inventes cifras.
2. Distingue HECHOS, INFERENCIAS e HIPÓTESIS. Una hipótesis causal nunca debe presentarse como hecho.
3. Compara contra meta y referencias disponibles.
4. Busca cuellos de botella del embudo.
5. Distingue actividad, productividad y conversión.
6. No atribuyas bajo resultado a un asesor sin revisar actividad, volumen y conversión.
7. Prioriza máximo 3 acciones.
8. Cada acción debe incluir responsable sugerido, plazo y KPI de verificación si la información lo permite.
9. Si faltan datos, dilo explícitamente.
10. Sé ejecutivo, preciso y accionable.

RESPONDE EN ESTE FORMATO:
ESTADO GENERAL
HALLAZGOS CRÍTICOS
OPORTUNIDADES
DIAGNÓSTICO POR ASESOR
FORECAST
3 ACCIONES PRIORITARIAS
SEÑALES PARA VIGILAR MAÑANA`;

function n(v) { const x = Number(v); return Number.isFinite(x) ? x : null; }
function p(v) { const x = n(v); return x === null ? null : Math.round(x * 100) / 100; }
function arr(v) { return Array.isArray(v) ? v : []; }

function buildContext(body = {}) {
  const d = body.data || body;
  return {
    date: d.date || new Date().toISOString().slice(0, 10),
    company: {
      sales: n(d.company?.sales), target: n(d.company?.target),
      achievementPct: p(d.company?.achievementPct),
      requiredDailyPace: n(d.company?.requiredDailyPace), currentDailyPace: n(d.company?.currentDailyPace),
      variationVsPreviousPeriodPct: p(d.company?.variationVsPreviousPeriodPct)
    },
    funnel: d.funnel || {},
    forecast: d.forecast || {},
    advisors: arr(d.advisors).map(a => ({
      name: a.name || a.asesor || null, sales: n(a.sales), target: n(a.target),
      achievementPct: p(a.achievementPct), activity: n(a.activity),
      activityVariationPct: p(a.activityVariationPct), conversionPct: p(a.conversionPct),
      conversionVariationPct: p(a.conversionVariationPct), forecastPct: p(a.forecastPct)
    })),
    alerts: arr(d.alerts).slice(0, 20),
    previousAnalysis: d.previousAnalysis || null
  };
}

function signals(c) {
  const out = [];
  if (c.company.achievementPct !== null && c.company.achievementPct < 80) out.push({severity:'critical', type:'target', message:`Cumplimiento ${c.company.achievementPct}%`});
  else if (c.company.achievementPct !== null && c.company.achievementPct < 95) out.push({severity:'attention', type:'target', message:`Cumplimiento ${c.company.achievementPct}%`});
  const projected = n(c.forecast.projectedAchievementPct);
  if (projected !== null && projected < 90) out.push({severity:'critical', type:'forecast', message:`Forecast ${projected}%`});
  if (c.company.requiredDailyPace !== null && c.company.currentDailyPace !== null && c.company.currentDailyPace < c.company.requiredDailyPace) out.push({severity:'attention', type:'pace', message:'Ritmo actual inferior al requerido'});
  const prospectConversion = n(c.funnel.prospectToSalePct);
  if (prospectConversion !== null && prospectConversion < 5) out.push({severity:'attention', type:'conversion', message:`Conversión prospecto a venta baja (${prospectConversion}%)`});
  for (const a of c.advisors) if (a.name && a.activity !== null && a.conversionPct !== null && a.activity > 0 && a.conversionPct < 5) out.push({severity:'attention', type:'advisor_conversion', advisor:a.name, message:`${a.name}: actividad con conversión ${a.conversionPct}%`});
  return out;
}

async function askClaude(context, detectedSignals) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Falta ANTHROPIC_API_KEY');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model:DEFAULT_MODEL,max_tokens:1800,system:SYSTEM_PROMPT,messages:[{role:'user',content:`CONTEXTO:\n${JSON.stringify(context,null,2)}\n\nSEÑALES PRECALCULADAS:\n${JSON.stringify(detectedSignals,null,2)}`}]})
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || `Anthropic error ${response.status}`);
  const text = arr(body.content).filter(x=>x.type==='text').map(x=>x.text).join('\n');
  return {text, model:body.model || DEFAULT_MODEL, usage:body.usage || null};
}

export default async function handler(req,res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  try {
    const context = buildContext(req.body || {});
    const detectedSignals = signals(context);
    const result = await askClaude(context, detectedSignals);
    return res.status(200).json({ok:true,agent:'coach-estrategico-v1',generatedAt:new Date().toISOString(),signals:detectedSignals,analysis:result.text,model:result.model,usage:result.usage});
  } catch (error) {
    console.error('Coach agent error:', error);
    return res.status(500).json({ok:false,error:error.message || 'Error ejecutando Coach Estratégico'});
  }
}
