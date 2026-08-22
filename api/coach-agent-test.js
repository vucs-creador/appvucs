// Manual smoke-test helper. This does not execute automatically in production.
// POST this payload to /api/coach-agent from a local/API client after configuring ANTHROPIC_API_KEY.
export const sampleCoachPayload = {
  date: '2026-08-22',
  company: {
    sales: 42,
    target: 60,
    achievementPct: 70,
    requiredDailyPace: 3,
    currentDailyPace: 2.1,
    variationVsPreviousPeriodPct: -8
  },
  funnel: {
    prospects: 420,
    contacts: 250,
    followups: 180,
    procedures: 70,
    sales: 42,
    prospectToSalePct: 10,
    followupToSalePct: 23.3
  },
  forecast: {
    projectedSales: 53,
    projectedAchievementPct: 88.3,
    gapToTarget: 7
  },
  advisors: [
    { name: 'Asesor A', sales: 15, target: 15, achievementPct: 100, activity: 80, conversionPct: 18, forecastPct: 103 },
    { name: 'Asesor B', sales: 5, target: 15, achievementPct: 33, activity: 75, conversionPct: 4, forecastPct: 45 }
  ],
  alerts: ['11 oportunidades requieren seguimiento'],
  previousAnalysis: null
};
