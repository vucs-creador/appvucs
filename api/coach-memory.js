// V1 memory contract. Persistence is deliberately abstract so it can use
// the existing AppVucs storage first and a dedicated table later.

export function createAnalysisRecord({ analysis, signals = [], context = {}, actions = [] } = {}) {
  return {
    id: `coach-${Date.now()}`,
    createdAt: new Date().toISOString(),
    type: 'daily-commercial-analysis',
    status: 'generated',
    summary: analysis || '',
    signals,
    actions,
    contextSnapshot: {
      date: context.date || null,
      company: context.company || null,
      forecast: context.forecast || null
    }
  };
}

export function createActionRecord({ title, owner = null, dueDate = null, targetKpi = null, expectedResult = null } = {}) {
  return {
    id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    title,
    owner,
    dueDate,
    targetKpi,
    expectedResult,
    status: 'open',
    outcome: null,
    closedAt: null
  };
}
