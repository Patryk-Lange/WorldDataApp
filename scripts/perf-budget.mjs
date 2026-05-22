import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const rootDir = process.cwd();
const budgetPath = path.join(rootDir, 'perf-budget.json');
const reportsDir = path.join(rootDir, 'reports', 'perf');
const latestPath = path.join(reportsDir, 'latest.json');
const baselinePath = path.join(reportsDir, 'baseline.json');
const updateBaseline = process.argv.includes('--update-baseline');
const sampleCount = Math.max(1, Number.parseInt(process.env.PERF_SAMPLE_COUNT || '3', 10) || 3);
const warmupRuns = Math.max(0, Number.parseInt(process.env.PERF_WARMUP_RUNS || '1', 10) || 1);

const appUrl = process.env.APP_URL || pathToFileURL(path.resolve(rootDir, 'index.html')).href;

const budgets = JSON.parse(await fs.readFile(budgetPath, 'utf8'));

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  if (!sorted.length) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

async function measurePage(context, url) {
  const page = await context.newPage();
  const started = Date.now();

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true', { timeout: 60000 });

  const measured = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const resources = performance.getEntriesByType('resource');
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find(entry => entry.name === 'first-contentful-paint');

    const totalBytes = resources.reduce((sum, entry) => {
      const size = entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0;
      return sum + size;
    }, 0);

    const totalScriptBytes = resources
      .filter(entry => entry.initiatorType === 'script')
      .reduce((sum, entry) => {
        const size = entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0;
        return sum + size;
      }, 0);

    return {
      appReadyMs: performance.now(),
      domContentLoadedMs: nav ? nav.domContentLoadedEventEnd : null,
      loadMs: nav ? nav.loadEventEnd : null,
      firstContentfulPaintMs: fcp ? fcp.startTime : null,
      resourceCount: resources.length,
      transferSizeBytes: totalBytes,
      totalScriptBytes,
    };
  });

  await page.close();
  return {
    ...measured,
    elapsedWallClockMs: Date.now() - started,
  };
}

function aggregateSamples(samples) {
  const keys = [
    'appReadyMs',
    'domContentLoadedMs',
    'loadMs',
    'firstContentfulPaintMs',
    'resourceCount',
    'transferSizeBytes',
    'totalScriptBytes',
    'elapsedWallClockMs',
  ];

  const aggregated = {};
  keys.forEach(key => {
    const values = samples.map(sample => sample[key]).filter(Number.isFinite);
    aggregated[key] = values.length ? round(median(values)) : null;
  });
  return aggregated;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });

const startedAt = Date.now();

for (let i = 0; i < warmupRuns; i++) {
  await measurePage(context, appUrl);
}

const samples = [];
for (let i = 0; i < sampleCount; i++) {
  samples.push(await measurePage(context, appUrl));
}

await browser.close();

const measured = aggregateSamples(samples);

const metrics = {
  appReadyMs: round(measured.appReadyMs),
  domContentLoadedMs: round(measured.domContentLoadedMs),
  loadMs: round(measured.loadMs),
  firstContentfulPaintMs: round(measured.firstContentfulPaintMs),
  resourceCount: measured.resourceCount,
  transferSizeBytes: measured.transferSizeBytes,
  totalScriptBytes: measured.totalScriptBytes,
  measuredAt: new Date().toISOString(),
  elapsedWallClockMs: Date.now() - startedAt,
  perfSampleCount: sampleCount,
  perfWarmupRuns: warmupRuns,
  appUrl,
};

const checks = [
  { key: 'domContentLoadedMs', budget: budgets.maxDomContentLoadedMs, label: 'DOM Content Loaded' },
  { key: 'loadMs', budget: budgets.maxLoadMs, label: 'Load Event End' },
  { key: 'appReadyMs', budget: budgets.maxAppReadyMs, label: 'App Ready' },
  { key: 'firstContentfulPaintMs', budget: budgets.maxFirstContentfulPaintMs, label: 'First Contentful Paint' },
  { key: 'resourceCount', budget: budgets.maxResourceCount, label: 'Resource Count' },
  { key: 'transferSizeBytes', budget: budgets.maxTransferSizeBytes, label: 'Transfer Size (bytes)' },
  { key: 'totalScriptBytes', budget: budgets.maxTotalScriptBytes, label: 'Total Script Size (bytes)' },
].filter(item => Number.isFinite(item.budget));

const failures = [];
const results = checks.map(check => {
  const value = metrics[check.key];
  const passed = Number.isFinite(value) && value <= check.budget;
  if (!passed) {
    failures.push(`${check.label}: ${value} > ${check.budget}`);
  }
  return {
    metric: check.key,
    label: check.label,
    value,
    budget: check.budget,
    passed,
  };
});

let baseline = null;
let baselineComparisons = [];
try {
  baseline = JSON.parse(await fs.readFile(baselinePath, 'utf8'));
} catch (_) {
  baseline = null;
}

if (baseline) {
  const ratioLimit = Number.isFinite(budgets.maxRegressionRatio) ? budgets.maxRegressionRatio : 1.35;
  const comparable = ['appReadyMs', 'domContentLoadedMs', 'loadMs', 'firstContentfulPaintMs'];

  for (const key of comparable) {
    const prev = baseline.metrics?.[key];
    const current = metrics[key];
    if (!Number.isFinite(prev) || !Number.isFinite(current) || prev <= 0) continue;

    const ratio = current / prev;
    const passed = ratio <= ratioLimit;
    baselineComparisons.push({
      metric: key,
      baseline: prev,
      current,
      ratio: round(ratio),
      ratioLimit,
      passed,
    });

    if (!passed) {
      failures.push(`Baseline regression ${key}: ${current} is ${round(ratio)}x baseline ${prev} (limit ${ratioLimit}x)`);
    }
  }
}

const report = {
  budgets,
  metrics,
  samples: samples.map(sample => ({
    appReadyMs: round(sample.appReadyMs),
    domContentLoadedMs: round(sample.domContentLoadedMs),
    loadMs: round(sample.loadMs),
    firstContentfulPaintMs: round(sample.firstContentfulPaintMs),
    resourceCount: sample.resourceCount,
    transferSizeBytes: sample.transferSizeBytes,
    totalScriptBytes: sample.totalScriptBytes,
    elapsedWallClockMs: sample.elapsedWallClockMs,
  })),
  checks: results,
  baselineComparisons,
  pass: failures.length === 0,
  failures,
};

await fs.mkdir(reportsDir, { recursive: true });
await fs.writeFile(latestPath, JSON.stringify(report, null, 2));

if (updateBaseline) {
  await fs.writeFile(baselinePath, JSON.stringify({ budgets, metrics }, null, 2));
  console.log(`Updated performance baseline at ${path.relative(rootDir, baselinePath)}`);
}

if (report.pass) {
  console.log('Performance budget check passed.');
  console.log(`Report: ${path.relative(rootDir, latestPath)}`);
} else {
  console.error('Performance budget check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  console.error(`Report: ${path.relative(rootDir, latestPath)}`);
  process.exit(1);
}
