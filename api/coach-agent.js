const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

const SYSTEM_PROMPT = `Eres el Coach Estratégico Comercial de AppVucs.

Tu función es analizar la operación comercial con criterio gerencial. No eres un generador de reportes: debes detectar desviaciones, explicar evidencia, distinguir hechos de inferencias e hipótesis, priorizar y proponer acciones verificables.

REGLAS:
1. Nunca presentes una hipótesis causal como un hecho.
2. Usa únicamente los datos suministrados.
3. Compara contra meta, periodo anterior y tendencia cuando existan.
4. Busca cuellos de botella del embudo, no solamente ventas finales.
5. Distingue actividad de productividad y productividad de conversión.
6. No culpes a un asesor por bajo resultado sin revisar actividad, volumen y conversión.
7. Prioriza máximo 3 acciones de alto impacto.
8. Cada acción debe tener responsable sugerido, plazo y KPI de verificación cuando sea posible.
9. Si faltan datos, dilo explícitamente.
10. No inventes cifras.

ESTRUCTURA OBLIGATORIA:
- Estado general
- Hallazgos críticos
- Oportunidades
- Diagnóstico por asesor (solo cuando haya evidencia suficiente)
- Forecast
- 3 acciones prioritarias
- Señales que deben vigilarse mañana

Responde en español, de forma ejecutiva, precisa y accionable.`;

function clean(value) {
  if (value === null || value === undefined || value === '') return null;
  return value;
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function pct(value) {
  const n = number(value);
  return n === null ? null : Math.round(n * 100) / 100;
}

function buildExecutiveContext(payload) {
  const data = payload?.data || payload || {};
  const company = data.company || {};
  const advisors = Array.isArray(data.advisors) ? data.advisors : [];
  const funnel = data.funnel || {};
  const forecast = data.forecast || {};
  const alerts = Array.isArray(data.alerts) ? data.alerts : [];
  const previous = data.previousAnalysis || null;

  return {
    date: clean(data.date) || new Date().toISOString().slice(0, 10),
    company: {
      sales: number(company.sales),
      target: number(company.target),
      achievementPct: pct(company.achievementPct),
      requiredDailyPace: number(company.requiredDailyPace),
      currentDailyPace: number(company.currentDailyPace),
      variationVsPreviousPeriodPct: pct(company.variationVsPreviousPeriodPct)
    },
    funnel: {
      prospects: number(funnel.prospects),
      contacts: number(funnel.contacts),
      followups: number(funnel.followups),
      procedures: number(funnel.procedures),
      sales: number(funnel.sales),
      prospectToSalePct: pct(funnel.prospectToSalePct),
      followupToSalePct: pct(funnel.followupToSalePct)
    },
    forecast: {
      projectedSales: number(forecast.projectedSales),
      projectedAchievementPct: pct(forecast.projectedAchievementPct),
      gapToTarget: number(forecast.gapToTarget)
    },
    advisors: advisors.map(a => ({
      name: clean(a.name || a.asesor),
      sales: number(a.sales),
      target: number(a.target),
      achievementPct: pct(a.achievementPct),
      activity: number(a.activity),
      activityVariationPct: pct(a.activityVariationPct),
      conversionPct: pct(a.conversionPct),
      conversionVariationPct: pct(a.conversionVariationPct),
      forecastPct: pct(a.forecastPct)
    })),
    alerts: alerts.slice(0, 20),
    previousAnalysis: previous
  };
}

function heuristicSignals(ctx) {
  const signals = [];
  const c = ctx.company;
  const f = ctx.funnel;
  const fc = ctx.forecast;

  if (c.achievementPct !== null && c.achievementPct < 80) {
    signals.push({ severity: 'critical', type: 'target', message: `Cumplimiento actual por debajo de 80% (${c.achievementPct}%).` });
  } else if (c.achievementPct !== null && c.achievementPct < 95) {
    signals.push({ severity: 'attention', type: 'target', message: `Cumplimiento inferior al objetivo (${c.achievementPct}%).` });
  }

  if (fc.projectedAchievementPct !== null && fc.projectedAchievementPct < 90) {
    signals.push({ severity: 'critical', type: 'forecast', message: `Forecast inferior a 90% de meta (${fc.projectedAchievementPct}%).` });
  }

  if (c.requiredDailyPace !== null && c.currentDailyPace !== null && c.currentDailyPace < c.requiredDailyPace) {
    signals.push({ severity: 'attention', type: 'pace', message: 'El ritmo actual está por debajo del ritmo requerido.' });
  }

  if (f.prospectToSalePct !== null && f.prospectToSalePct < 5) {
    signals.push({ severity: 'attention', type: 'conversion', message: `Conversión prospecto a venta baja (${f.prospectToSalePct}%).` });
  }

  for (const a of ctx.advisors) {
    if (a.name && a.activity !== null && a.conversionPct !== null && a.activity > 0 && a.conversionPct < 5) {
      signals.push({ severity: 'attention', type: 'advisor_conversion', advisor: a.name, message: `${a.name}: actividad registrada pero conversión baja (${a.conversionPct}%).` });
    }
  }

  return signals;
}

async function callAnthropic(context, signals) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Falta ANTHROPIC_API_KEY');

  const userPrompt = `Analiza el siguiente contexto comercial estructurado. No inventes datos. Usa las señales heurísticas solo como pistas y valida con el contexto.\n\nCONTEXTO:\n${JSON.stringify(context, null, 2)}\n\nSEÑALES PRECALCULADAS:\n${JSON.stringify(signals, null, 2)}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: 1800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message || `Anthropic error ${response.status}`);
  }

  const text = Array.isArray(body.content)
    ? body.content.filter(x => x.type === 'text').map(x => x.text).join('\n')
    : '';

  return { text, model: body.model || DEFAULT_MODEL, usage: body.usage || null };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const context = buildExecutiveContext(req.body || {});
    const signals = heuristicSignals(context);
    const result = await callAnthropic(context, signals);

    return res.status(200).json({
      ok: true,
      agent: 'coach-estrategico-v1',
      generatedAt: new Date().toISOString(),
      signals,
      analysis: result.text,
      model: result.model,
      usage: result.usage
    });
  } catch (error) {
    console.error('Coach agent error:', error);
    return res.status(500).json({ ok: false, error: error.message || 'Error ejecutando Coach Estratégico' });
  }
}
