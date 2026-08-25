// Tool layer for Coach Estratégico V1.
// V1 is read-only and intentionally independent from Kommo.
// The frontend can call these endpoints with already calculated AppVucs data.

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function normalizeCompanyKpis(data = {}) {
  return {
    sales: num(data.sales),
    target: num(data.target),
    achievementPct: num(data.achievementPct),
    requiredDailyPace: num(data.requiredDailyPace),
    currentDailyPace: num(data.currentDailyPace),
    variationVsPreviousPeriodPct: num(data.variationVsPreviousPeriodPct)
  };
}

export function normalizeAdvisorKpis(advisors = []) {
  return safeArray(advisors).map(a => ({
    name: a.name || a.asesor || null,
    sales: num(a.sales),
    target: num(a.target),
    achievementPct: num(a.achievementPct),
    activity: num(a.activity),
    conversionPct: num(a.conversionPct),
    forecastPct: num(a.forecastPct)
  }));
}

export function buildCoachToolPayload(input = {}) {
  return {
    date: input.date || new Date().toISOString().slice(0, 10),
    company: normalizeCompanyKpis(input.company),
    funnel: input.funnel || {},
    forecast: input.forecast || {},
    advisors: normalizeAdvisorKpis(input.advisors),
    alerts: safeArray(input.alerts).slice(0, 20),
    previousAnalysis: input.previousAnalysis || null
  };
}
