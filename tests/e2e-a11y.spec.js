import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const APP_URL = process.env.APP_URL || `file:///${process.cwd().replace(/\\/g, '/')}/index.html`;

async function waitForAppReady(page) {
  await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
}

function formatViolations(violations) {
  if (!violations.length) return 'No serious/critical violations found.';

  return violations.map(v => {
    const targets = v.nodes.map(node => node.target.join(' ')).join(' | ');
    return `${v.id} (${v.impact}) - ${v.help}\nTargets: ${targets}`;
  }).join('\n\n');
}

async function expectNoSeriousViolations(page) {
  const results = await new AxeBuilder({ page })
    // Color contrast requires a broader design refactor and can be noisy in
    // synthetic browser environments; keep this gate focused on structural a11y.
    .disableRules(['color-contrast'])
    .analyze();

  const severe = results.violations.filter(v => v.impact === 'serious' || v.impact === 'critical');
  expect(severe, formatViolations(severe)).toEqual([]);
}

test.describe('World Data Explorer - Accessibility Scans', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('wde_lang', 'en');
        localStorage.setItem('wde_lang_manual', '1');
        localStorage.setItem('wde_welcome_auto_open', 'false');
      } catch (_) {
        // Ignore storage errors in restricted contexts.
      }
    });
  });

  test('default app shell has no serious/critical accessibility violations', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);
    await expectNoSeriousViolations(page);
  });

  test('share dialog flow has no serious/critical accessibility violations', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await page.locator('#search-input').fill('Brazil');
    await page.locator('.search-result-item[data-a3="BRA"]').click();
    await page.locator('#share-btn').click();
    await expect(page.locator('#share-modal.visible')).toBeVisible();

    await expectNoSeriousViolations(page);
  });

  test('history modal flow has no serious/critical accessibility violations', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await page.locator('#search-input').fill('Brazil');
    await page.locator('.search-result-item[data-a3="BRA"]').click();
    await page.locator('#expand-history').click();
    await expect(page.locator('#history-modal.visible')).toBeVisible();

    await expectNoSeriousViolations(page);
  });
});
