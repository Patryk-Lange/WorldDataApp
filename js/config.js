/* ============================================================
   World Data Explorer – config.js
   Centralised indicator registry. Every mode-specific behaviour
   derives from this single source of truth.
   ============================================================ */
'use strict';

function getI18N() {
  return (typeof window !== 'undefined' && window.WDE_I18N) ? window.WDE_I18N : null;
}

function i18nText(key, params, fallback) {
  const i18n = getI18N();
  if (i18n && typeof i18n.t === 'function') return i18n.t(key, params || {}, fallback || key);
  return fallback || key;
}

function i18nNumber(value, options) {
  const num = Number(value);
  if (!Number.isFinite(num)) return String(value);
  const i18n = getI18N();
  if (i18n && typeof i18n.formatNumber === 'function') return i18n.formatNumber(num, options || {});
  return num.toLocaleString(undefined, options || {});
}

function i18nUnit(key, fallback) {
  return i18nText(`units.${key}`, {}, fallback);
}

/* ----------------------------------------------------------
   Supported display currencies  (rates vs USD, approx. 2026)
---------------------------------------------------------- */
const CURRENCIES = [
  { id: 'USD', symbol: '$',    name: 'US Dollar',          rate: 1       },
  { id: 'EUR', symbol: '€',    name: 'Euro',               rate: 0.92    },
  { id: 'GBP', symbol: '£',    name: 'British Pound',      rate: 0.79    },
  { id: 'JPY', symbol: '¥',    name: 'Japanese Yen',       rate: 153.0   },
  { id: 'CNY', symbol: 'CN¥',  name: 'Chinese Yuan',       rate: 7.25    },
  { id: 'INR', symbol: '₹',    name: 'Indian Rupee',       rate: 83.5    },
  { id: 'BRL', symbol: 'R$',   name: 'Brazilian Real',     rate: 5.10    },
  { id: 'CAD', symbol: 'C$',   name: 'Canadian Dollar',    rate: 1.37    },
  { id: 'AUD', symbol: 'A$',   name: 'Australian Dollar',  rate: 1.53    },
  { id: 'CHF', symbol: 'Fr',   name: 'Swiss Franc',        rate: 0.90    },
  { id: 'KRW', symbol: '₩',    name: 'South Korean Won',   rate: 1340    },
  { id: 'MXN', symbol: 'MX$',  name: 'Mexican Peso',       rate: 17.2    },
  { id: 'SGD', symbol: 'S$',   name: 'Singapore Dollar',   rate: 1.34    },
  { id: 'SAR', symbol: '﷼',    name: 'Saudi Riyal',        rate: 3.75    },
  { id: 'PLN', symbol: 'zł',   name: 'Polish Złoty',       rate: 3.97    },
];

/* ----------------------------------------------------------
   Formatters  (sym defaults to '$'; pass active currency symbol)
---------------------------------------------------------- */
function fmtGDP(val, sym) {
  sym = sym || '$';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return sign + sym + i18nNumber(abs / 1_000_000, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + i18nUnit('trillion', 'T');
  }
  if (abs >= 1_000) {
    return sign + sym + i18nNumber(abs / 1_000, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + i18nUnit('billion', 'B');
  }
  return sign + sym + i18nNumber(abs, { maximumFractionDigits: 0 }) + i18nUnit('million', 'M');
}
function fmtRate(val)  { return i18nNumber(val, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; }
function fmtPop(val)   {
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1000) {
    return sign + i18nNumber(abs / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + i18nUnit('billion', 'B');
  }
  return sign + i18nNumber(abs, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + i18nUnit('million', 'M');
}
function fmtIndex(val) { return i18nNumber(val, { minimumFractionDigits: 1, maximumFractionDigits: 1 }); }
function fmtCO2(val)   { return i18nNumber(val, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + i18nUnit('tonnes', 't'); }
function fmtUSD(val, sym) {
  sym = sym || '$';
  const abs = Math.abs(val);
  const sign = val < 0 ? '-' : '';
  if (abs >= 1000) {
    return sign + sym + i18nNumber(abs / 1000, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + i18nUnit('trillion', 'T');
  }
  return sign + sym + i18nNumber(abs, { maximumFractionDigits: 0 }) + i18nUnit('billion', 'B');
}

/* ----------------------------------------------------------
   Indicator registry
   Each entry:
     id            – machine key, matches data variable name stem
     label         – button label (with emoji)
     dataVar       – global variable name in window scope
     unit          – display unit string
     higherIsBetter– true=green is higher, false=green is lower,
                     null=neutral grey scale
     group         – tab group label
     topLabel      – h3 for top list
     topOrder      – 'desc' | 'asc'  (which end is "best")
     format        – function(value) → string
     shareBase     – 'world_total' | 'world_avg' | null
     source        – data source name
     asOf          – data currency date
---------------------------------------------------------- */
const INDICATORS = [
  {
    id: 'gdp',
    label: '💰 GDP',
    dataVar: 'GDP_DATA',
    unit: 'USD',
    currencyBased: true,
    higherIsBetter: true,
    group: 'Economy',
    topLabel: 'Top 10 by GDP',
    topOrder: 'desc',
    format: fmtGDP,
    shareBase: 'world_total',
    source: 'World Bank',
    asOf: 'April 2026',
  },
  {
    id: 'gdp_per_capita',
    label: '👤 GDP / Capita',
    dataVar: 'GDP_PER_CAPITA_DATA',
    unit: 'USD',
    currencyBased: true,
    higherIsBetter: true,
    group: 'Economy',
    topLabel: 'Top 10 GDP per Capita',
    topOrder: 'desc',
    format: fmtGDP,
    shareBase: null,
    source: 'World Bank',
    asOf: 'April 2026',
  },
  {
    id: 'inflation',
    label: '📈 Inflation',
    dataVar: 'INFLATION_DATA',
    unit: '%',
    higherIsBetter: false,
    group: 'Economy',
    topLabel: 'Top 10 Highest Inflation',
    topOrder: 'desc',
    format: fmtRate,
    shareBase: 'world_avg',
    source: 'Trading Economics',
    asOf: 'April 2026',
  },
  {
    id: 'unemployment',
    label: '👥 Unemployment',
    dataVar: 'UNEMPLOYMENT_DATA',
    unit: '%',
    higherIsBetter: false,
    group: 'Society',
    topLabel: 'Top 10 Lowest Unemployment',
    topOrder: 'asc',
    format: fmtRate,
    shareBase: 'world_avg',
    source: 'Trading Economics',
    asOf: 'April 2026',
  },
  {
    id: 'population',
    label: '🌍 Population',
    dataVar: 'POPULATION_DATA',
    unit: 'M',
    higherIsBetter: null,
    group: 'Society',
    topLabel: 'Top 10 by Population',
    topOrder: 'desc',
    format: fmtPop,
    shareBase: 'world_total',
    source: 'UN 2026',
    asOf: 'January 2026',
  },
  {
    id: 'life_expectancy',
    label: '❤️ Life Expectancy',
    dataVar: 'LIFE_EXPECTANCY_DATA',
    unit: 'yrs',
    higherIsBetter: true,
    group: 'Society',
    topLabel: 'Top 10 Life Expectancy',
    topOrder: 'desc',
    format: fmtIndex,
    shareBase: null,
    source: 'WHO',
    asOf: '2024',
  },
  {
    id: 'gini',
    label: '⚖️ Gini Index',
    dataVar: 'GINI_DATA',
    unit: '',
    higherIsBetter: false,
    group: 'Society',
    topLabel: 'Top 10 Lowest Inequality',
    topOrder: 'asc',
    format: fmtIndex,
    shareBase: null,
    source: 'World Bank',
    asOf: '2025',
  },
  {
    id: 'co2',
    label: '🌱 CO₂/Capita',
    dataVar: 'CO2_DATA',
    unit: 'tonnes',
    higherIsBetter: false,
    group: 'Environment',
    topLabel: 'Top 10 Cleanest (CO₂)',
    topOrder: 'asc',
    format: fmtCO2,
    shareBase: null,
    source: 'IEA',
    asOf: '2024',
  },
  {
    id: 'trade_balance',
    label: '🔄 Trade Balance',
    dataVar: 'TRADE_BALANCE_DATA',
    unit: 'USD B',
    currencyBased: true,
    higherIsBetter: null,
    group: 'Economy',
    topLabel: 'Top 10 Trade Surplus',
    topOrder: 'desc',
    format: fmtUSD,
    shareBase: null,
    source: 'WTO',
    asOf: '2025',
  },
  {
    id: 'debt_to_gdp',
    label: '🏦 Debt/GDP',
    dataVar: 'DEBT_TO_GDP_DATA',
    unit: '%',
    higherIsBetter: false,
    group: 'Economy',
    topLabel: 'Top 10 Lowest Debt',
    topOrder: 'asc',
    format: fmtRate,
    shareBase: null,
    source: 'IMF',
    asOf: '2025',
  },
];

/* Helper: look up indicator definition by id */
function getIndicator(id) {
  return INDICATORS.find(ind => ind.id === id) || INDICATORS[0];
}
