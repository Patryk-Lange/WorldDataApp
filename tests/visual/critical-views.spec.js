import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || `file:///${process.cwd().replace(/\\/g, '/')}/index.html`;

async function waitForAppReady(page) {
  await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
}

async function searchAndPick(page, query, a3) {
  await page.locator('#search-input').fill(query);
  await page.locator(`.search-result-item[data-a3="${a3}"]`).click();
}

test.describe('World Data Explorer - Visual Regression', () => {
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

    await page.goto(APP_URL);
    await waitForAppReady(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('dashboard overview', async ({ page }) => {
    await expect(page).toHaveScreenshot('dashboard-overview.png', { fullPage: true });
  });

  test('single country detail view', async ({ page }) => {
    await searchAndPick(page, 'Brazil', 'BRA');
    await expect(page).toHaveScreenshot('country-detail-bra.png', { fullPage: true });
  });

  test('multi-country comparison view', async ({ page }) => {
    await searchAndPick(page, 'United States', 'USA');
    await searchAndPick(page, 'Canada', 'CAN');
    await searchAndPick(page, 'Brazil', 'BRA');
    await expect(page).toHaveScreenshot('comparison-view.png', { fullPage: true });
  });

  test('history modal view', async ({ page }) => {
    await searchAndPick(page, 'Brazil', 'BRA');
    await page.locator('#expand-history').click();
    await expect(page.locator('#history-modal.visible')).toBeVisible();
    await expect(page).toHaveScreenshot('history-modal-view.png', { fullPage: true });
  });
});
