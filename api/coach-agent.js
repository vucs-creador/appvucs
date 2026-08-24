const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Eres el Coach Estratégico Comercial de Gerónimo (Grupo DF).

MISIÓN: vigilar la operación comercial, detectar desviaciones y oportunidades, explicar evidencia, priorizar acciones y hacer seguimiento.

REGLAS:
1. Usa únicamente los datos recibidos. Nunca inventes cifras.
2. Distingue HECHOS, INFERENCIAS e HIPÓTESIS. Una hipótesis causal nunca debe presentarse como hecho.
3. MÉTRICA OFICIAL, NUNCA LA MEZCLES: la meta se cumple con "nuevos + reingresos" únicamente (campo company.sales / advisor.ventasVsMeta). Renovaciones es un indicador de RETENCIÓN aparte, se mide contra cartera (company.renovacionesPct / advisor.renovacionesPct), y JAMÁS cuenta para el cumplimiento de la meta. Si hablas de renovaciones, acláralo siempre como retención, no como venta nueva.
4. Diagnostica el EMBUDO PERSONAL de cada asesor, no solo el total: mensajes/referidos/remarketing (prospección) -> seguimientos -> vcampana/vreferido/vrmk (cierre por canal). Di en qué escalón se atasca cada quien: sin prospección, prospección sin seguimiento, o seguimiento sin cierre son problemas distintos y piden acciones distintas.
5. Identifica el mejor y el peor canal de cierre del equipo (campaña, referido, RMK, reingresos) usando funnel.canales.
6. No atribuyas bajo resultado a un asesor sin revisar su propio embudo completo (prospección, seguimiento y cierre). El diagnóstico por asesor es para observar patrones y ayudar, nunca para juzgar.
7. Prioriza máximo 3 acciones.
8. Cada acción debe incluir responsable sugerido, plazo y KPI de verificación si la información lo permite.
9. Si faltan datos, dilo explícitamente en vez de rellenar con suposiciones.
10. Sé ejecutivo, preciso y accionable.
11. LENGUAJE SIMPLE Y DIRECTO: quien lee esto interpreta números pero no es estadístico ni experto en ventas. Nada de jerga técnica ("varianza", "desviación estándar", "percentil"), nada de anglicismos innecesarios, frases cortas. Si usas un porcentaje o cifra, dile en una frase qué significa en la práctica.

RESPONDE EXACTAMENTE EN ESTAS DOS PARTES, EN ESTE ORDEN:

=== REPORTE DEL DÍA ANTERIOR ===
Usa el bloque "daily" del contexto (el último día con datos registrados, ya calculado como nuevos+reingresos). Si "daily" no trae datos (sales/activity en 0 o null), dilo así: "No hay registros del día anterior todavía." No inventes ni asumas.
- Cómo estuvo el día (una frase directa)
- Comparado con lo que se necesitaba ese día (ritmo requerido)
- Una sola cosa a ajustar hoy, si aplica

=== REPORTE DEL MES ===
Usa el resto del contexto (acumulado del mes).
ESTADO GENERAL — nuevos + reingresos vs meta, y por separado renovaciones vs cartera
HALLAZGOS CRÍTICOS
OPORTUNIDADES
CANALES DE VENTA — cuál canal está jalando y cuál está flojo
EMBUDO POR ASESOR — para cada asesor con datos: en qué escalón se atasca (prospección / seguimiento / cierre) y su retención de cartera aparte
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
      variationVsPreviousPeriodPct: p(d.company?.variationVsPreviousPeriodPct),
      nuevos: n(d.company?.nuevos), reingresos: n(d.company?.reingresos),
      renovaciones: n(d.company?.renovaciones), cartera: n(d.company?.cartera), renovacionesPct: p(d.company?.renovacionesPct)
    },
    funnel: {
      ...(d.funnel || {}),
      canales: arr(d.funnel?.canales), mejorCanal: d.funnel?.mejorCanal || null
    },
    forecast: d.forecast || {},
    advisors: arr(d.advisors).map(a => ({
      name: a.name || a.asesor || null,
      mensajes: n(a.mensajes), referidos: n(a.referidos), remarketing: n(a.remarketing), seguimientos: n(a.seguimientos),
      vcampana: n(a.vcampana), vreferido: n(a.vreferido), vrmk: n(a.vrmk), nuevos: n(a.nuevos), reingresos: n(a.reingresos),
      ventasVsMeta: n(a.ventasVsMeta), target: n(a.target), achievementPct: p(a.achievementPct),
      renovaciones: n(a.renovaciones), cartera: n(a.cartera), renovacionesPct: p(a.renovacionesPct),
      activity: n(a.activity), activityVariationPct: p(a.activityVariationPct), conversionPct: p(a.conversionPct),
      conversionVariationPct: p(a.conversionVariationPct), forecastPct: p(a.forecastPct)
    })),
    daily: {
      label: d.daily?.label || null, sales: n(d.daily?.sales), activity: n(d.daily?.activity),
      requiredDailyPace: n(d.daily?.requiredDailyPace), achievementPct: p(d.daily?.achievementPct)
    },
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
  if (c.company.renovacionesPct !== null && c.company.renovacionesPct < 50) out.push({severity:'attention', type:'retention', message:`Renovaciones en ${c.company.renovacionesPct}% de la cartera — riesgo de fuga de clientes`});
  for (const a of c.advisors) {
    if (!a.name) continue;
    const prospeccion = (a.mensajes||0) + (a.referidos||0) + (a.remarketing||0);
    if (prospeccion > 0 && a.conversionPct !== null && a.conversionPct < 5) out.push({severity:'attention', type:'advisor_conversion', advisor:a.name, message:`${a.name}: prospección activa pero conversión de ${a.conversionPct}%`});
    if (prospeccion === 0 && (a.target||0) > 0) out.push({severity:'attention', type:'advisor_prospecting', advisor:a.name, message:`${a.name}: sin actividad de prospección registrada este mes`});
    if (a.cartera > 0 && a.renovacionesPct !== null && a.renovacionesPct < 40) out.push({severity:'attention', type:'advisor_retention', advisor:a.name, message:`${a.name}: renovaciones en ${a.renovacionesPct}% de su cartera`});
  }
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

const CHAT_SYSTEM_PROMPT = `Eres el Coach Estratégico Comercial de Gerónimo (Grupo DF), conversando por chat con el CEO o director que consulta la operación.

REGLAS:
1. Responde solo con base en el CONTEXTO que te dieron. Si algo no está ahí, dilo claramente ("eso no está en los datos que tengo") en vez de inventarlo.
2. Lenguaje simple, directo, sin jerga técnica ni anglicismos innecesarios.
3. Respuestas cortas: 3 a 6 frases, salvo que te pidan explícitamente más detalle.
4. No atribuyas bajo resultado a un asesor por nombre sin evidencia de actividad y volumen suficiente. El propósito de hablar de un asesor es observar patrones, nunca juzgar.
5. Si la pregunta pide una acción o decisión, sé concreto: qué hacer, quién, para cuándo.`;

async function askClaudeChat(context, history, message) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error('Falta ANTHROPIC_API_KEY');
  const messages = [
    {role:'user', content:`CONTEXTO OPERATIVO ACTUAL (unico material valido para responder):\n${JSON.stringify(context,null,2)}`},
    {role:'assistant', content:'Listo, ya tengo el contexto de la operación. ¿Qué quieres saber?'}
  ];
  for (const h of arr(history).slice(-20)) {
    messages.push({role: h.role==='assistant' ? 'assistant' : 'user', content: String(h.text||'').slice(0,2000)});
  }
  messages.push({role:'user', content: message});
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method:'POST', headers:{'content-type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model:DEFAULT_MODEL,max_tokens:700,system:CHAT_SYSTEM_PROMPT,messages})
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body?.error?.message || `Anthropic error ${response.status}`);
  const text = arr(body.content).filter(x=>x.type==='text').map(x=>x.text).join('\n');
  return {text, model:body.model || DEFAULT_MODEL, usage:body.usage || null};
}

export default async function handler(req,res) {
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  try {
    if (req.body && req.body.chat === true) {
      const context = buildContext({data: req.body.context || {}});
      const message = String(req.body.message || '').slice(0,2000);
      if (!message.trim()) return res.status(400).json({ok:false,error:'Falta el mensaje.'});
      const result = await askClaudeChat(context, req.body.history, message);
      return res.status(200).json({ok:true,reply:result.text,model:result.model,usage:result.usage});
    }
    const context = buildContext(req.body || {});
    const detectedSignals = signals(context);
    const result = await askClaude(context, detectedSignals);
    return res.status(200).json({ok:true,agent:'coach-estrategico-v1',generatedAt:new Date().toISOString(),signals:detectedSignals,analysis:result.text,model:result.model,usage:result.usage});
  } catch (error) {
    console.error('Coach agent error:', error);
    return res.status(500).json({ok:false,error:error.message || 'Error ejecutando Coach Estratégico'});
  }
}
