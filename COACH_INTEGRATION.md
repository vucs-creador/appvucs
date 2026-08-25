# AppVucs → Coach Estratégico V1

## Estado

El motor del agente y el adaptador de snapshot están implementados en la rama `feature/agente-coach-v1`.

## Contrato de datos

La aplicación debe entregar a `window.AppVucsCoach.run(snapshot)` un objeto con esta forma:

```js
{
  date: 'YYYY-MM-DD',
  company: {
    sales: Number,
    target: Number,
    achievementPct: Number,
    requiredDailyPace: Number,
    currentDailyPace: Number,
    variationVsPreviousPeriodPct: Number
  },
  funnel: {
    prospects: Number,
    contacts: Number,
    followups: Number,
    procedures: Number,
    sales: Number,
    prospectToSalePct: Number,
    followupToSalePct: Number
  },
  forecast: {
    projectedSales: Number,
    projectedAchievementPct: Number,
    gapToTarget: Number
  },
  advisors: [
    {
      name: String,
      sales: Number,
      target: Number,
      achievementPct: Number,
      activity: Number,
      activityVariationPct: Number,
      conversionPct: Number,
      conversionVariationPct: Number,
      forecastPct: Number
    }
  ],
  alerts: [],
  previousAnalysis: null
}
```

## Montaje en la app existente

La integración final debe cargar `coach-agent-ui.js` una sola vez y conectar el botón actual del Coach con `window.AppVucsCoach.run(snapshot)`. No se deben duplicar los cálculos de KPIs: AppVucs calcula y el agente interpreta.

## Seguridad

No se deben mover API keys al frontend. La llamada al modelo ocurre desde `/api/coach-agent` mediante variables de entorno de Vercel.

## Próximo paso

Identificar las funciones/objetos existentes de `index.html` que ya calculan el dashboard y construir `buildCoachSnapshot()` usando esas mismas fuentes. Después se puede probar el análisis manual antes de activar scheduler.
