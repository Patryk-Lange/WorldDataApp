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

const appUrl = process.env.APP_URL || pathToFileURL(path.resolve(rootDir, 'index.html')).href;

const budgets = JSON.parse(await fs.readFile(budgetPath, 'utf8'));

function round(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null;
}

function getResourceBytes(entry) {
  return entry.transferSize || entry.encodedBodySize || entry.decodedBodySize || 0;
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1366, height: 768 } });
const page = await context.newPage();

const startedAt = Date.now();
await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
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

await browser.close();

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
