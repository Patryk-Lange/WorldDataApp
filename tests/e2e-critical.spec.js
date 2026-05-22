import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const APP_URL = process.env.APP_URL || `file:///${process.cwd().replace(/\\/g, '/')}/index.html`;

async function waitForAppReady(page) {
  await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
}

async function searchAndPick(page, query, a3, assertDetail = true) {
  await page.locator('#search-input').fill(query);
  const item = page.locator(`.search-result-item[data-a3="${a3}"]`);
  await expect(item).toBeVisible();
  await item.click();

  if (assertDetail) {
    await expect(page.locator('#detail-card .country-code')).toContainText(a3);
  }
}

async function openExportMenu(page) {
  await page.locator('#export-btn').click();
  await expect(page.locator('#export-menu')).toBeVisible();
}

test.describe('World Data Explorer - Critical E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        if (!sessionStorage.getItem('__wde_test_seeded')) {
          localStorage.clear();
          sessionStorage.setItem('__wde_test_seeded', '1');
        }
        localStorage.setItem('wde_lang', 'en');
        localStorage.setItem('wde_lang_manual', '1');
        localStorage.setItem('wde_welcome_auto_open', 'false');
      } catch (e) {
        // Ignore storage errors in restricted contexts.
      }
    });
  });

  test('shows fallback error when world map topology cannot be loaded', async ({ page }) => {
    await page.route('**/world-atlas@2/countries-110m.json', route => route.abort());

    await page.goto(APP_URL);

    const error = page.locator('#detail-card .error');
    await expect(error).toBeVisible();
    await expect(error).toContainText('Failed to load map data');
  });

  test('restores mode and selected country from generated share URL', async ({ context, page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await searchAndPick(page, 'Brazil', 'BRA');
    await page.locator('[data-mode="inflation"]').click();

    await page.locator('#share-btn').click();
    const shareUrl = await page.locator('#share-url-input').inputValue();
    await expect(page.locator('#share-modal')).toBeVisible();

    const restored = await context.newPage();
    await restored.goto(shareUrl);
    await waitForAppReady(restored);

    await expect(restored.locator('[data-mode="inflation"]')).toHaveClass(/active/);
    await expect(restored.locator('#detail-card .country-code')).toContainText('BRA');
    await expect(restored).toHaveURL(/#.*mode=inflation/);
  });

  test('shows no-results guidance when search query has no matches', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await page.locator('#search-input').fill('zzzzzzzz');
    await expect(page.locator('#search-results.visible .search-result-item.is-empty')).toContainText('No matching countries');
  });

  test('falls back to execCommand copy path when Clipboard API fails', async ({ page }) => {
    await page.addInitScript(() => {
      window.__execCalled = false;
      window.__clipboardMocked = false;
      try {
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: {
            writeText() {
              return Promise.reject(new Error('permission denied'));
            },
          },
        });
        window.__clipboardMocked = true;
      } catch (e) {
        // ignore
      }

      document.execCommand = command => {
        if (command === 'copy') {
          window.__execCalled = true;
          return true;
        }
        return false;
      };
    });

    await page.goto(APP_URL);
    await waitForAppReady(page);
    await searchAndPick(page, 'Brazil', 'BRA');

    await page.locator('#share-btn').click();
    await expect(page.locator('#share-modal')).toBeVisible();

    const mocked = await page.evaluate(() => window.__clipboardMocked === true);
    expect(mocked).toBe(true);

    await page.locator('#copy-url-btn').click();
    await expect(page.locator('#copy-url-btn')).toContainText('Copied!');

    const usedFallback = await page.evaluate(() => window.__execCalled === true);
    expect(usedFallback).toBe(true);
  });

  test('exports CSV with expected header and non-empty dataset', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await openExportMenu(page);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-csv-btn').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    const path = await download.path();
    expect(path).not.toBeNull();

    const content = await fs.readFile(path, 'utf8');
    expect(content.startsWith('ISO-Alpha3,Country,')).toBe(true);
    expect(content.split('\n').length).toBeGreaterThan(50);
  });

  test('exports PNG map image as downloadable file', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await openExportMenu(page);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('#export-png-btn').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.png$/i);
    const path = await download.path();
    expect(path).not.toBeNull();

    const imageBytes = await fs.readFile(path);
    expect(imageBytes.byteLength).toBeGreaterThan(1024);
  });

  test('persists bookmarks across reload and renders watchlist item', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await searchAndPick(page, 'Brazil', 'BRA');
    await page.locator('#bookmark-btn-BRA').click();
    await expect.poll(async () => {
      return await page.evaluate(() => {
        const stored = JSON.parse(localStorage.getItem('wde_bookmarks') || '[]');
        return stored.includes('BRA');
      });
    }).toBe(true);
    await expect(page.locator('.wl-name[data-a3="BRA"]')).toHaveCount(1);

    await page.reload();
    await waitForAppReady(page);
    await expect(page.locator('.wl-name[data-a3="BRA"]')).toHaveCount(1);
  });

  test('requires confirmation before clearing entire watchlist', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await searchAndPick(page, 'Brazil', 'BRA');
    await page.locator('#bookmark-btn-BRA').click();
    await expect(page.locator('.wl-name[data-a3="BRA"]')).toHaveCount(1);

    await page.locator('#watchlist-toggle').click();
    await page.locator('#watchlist-clear-all').click();
    await expect(page.locator('#app-toast.visible')).toContainText('Click Clear all again to confirm');
    await expect(page.locator('.wl-name[data-a3="BRA"]')).toHaveCount(1);

    await page.locator('#watchlist-clear-all').click();
    await expect(page.locator('.watchlist-empty')).toBeVisible();
  });

  test('blocks bookmark creation when max bookmark limit is reached', async ({ page }) => {
    await page.addInitScript(() => {
      const maxed = ['USA', 'CAN', 'GBR', 'DEU', 'FRA', 'ITA', 'JPN', 'AUS', 'MEX', 'BRA'];
      localStorage.setItem('wde_bookmarks', JSON.stringify(maxed));
    });

    await page.goto(APP_URL);
    await waitForAppReady(page);
    await searchAndPick(page, 'China', 'CHN');

    await page.locator('#bookmark-btn-CHN').click();
    await expect(page.locator('#app-toast.visible')).toContainText('Max 10 bookmarks');

    await expect.poll(async () => {
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('wde_bookmarks') || '[]'));
      return stored.includes('CHN');
    }).toBe(false);
    await expect.poll(async () => {
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('wde_bookmarks') || '[]'));
      return stored.length;
    }).toBe(10);
  });

  test('enforces max 5 countries in comparison panel', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    const picks = [
      ['United States', 'USA'],
      ['Canada', 'CAN'],
      ['Brazil', 'BRA'],
      ['Australia', 'AUS'],
      ['Germany', 'DEU'],
      ['France', 'FRA'],
    ];

    for (let i = 0; i < picks.length; i++) {
      const [query, a3] = picks[i];
      await searchAndPick(page, query, a3, i === 0);
    }

    await expect(page.locator('#comparison-panel .cmp-row')).toHaveCount(5);
    await expect(page.locator('#comparison-panel .cmp-row[data-a3="USA"]')).toHaveCount(0);
  });

  test('applies impossible min/max filter boundaries and reset restores defaults', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await page.locator('#filter-toggle').click();
    await page.locator('#filter-min').fill('999999999');
    await page.locator('#filter-max').fill('1');

    await expect(page.locator('#filter-chips .filter-chip')).toHaveCount(2);
    await expect(page.locator('#top-list li')).toHaveCount(0);

    await page.locator('#filter-reset').click();
    await expect(page.locator('#top-list li')).toHaveCount(10);
  });

  test('applies exact equality filter boundaries for GDP values', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    const usaValue = await page.evaluate(() => GDP_DATA.USA);

    await page.locator('#filter-toggle').click();
    await page.locator('#filter-min').fill(String(usaValue));
    await page.locator('#filter-max').fill(String(usaValue));

    await expect(page.locator('#top-list li')).toHaveCount(1);
    await expect(page.locator('#top-list li .top-name')).toContainText('United States');
  });

  test('group filter constrains top list to group population (G7 <= 7)', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await page.locator('#group-selector').selectOption('G7');

    const count = await page.locator('#top-list li').count();
    expect(count).toBeGreaterThan(0);
    expect(count).toBeLessThanOrEqual(7);

    const invalidNames = await page.evaluate(() => {
      return [...document.querySelectorAll('#top-list li .top-name')]
        .map(el => el.textContent.trim())
        .filter(name => {
          const a3 = Object.keys(COUNTRY_NAMES).find(code => COUNTRY_NAMES[code] === name);
          return !a3 || !REGIONS.G7.includes(a3);
        });
    });
    expect(invalidNames).toEqual([]);
  });

  test('correlation explorer toggles trend stats and renders scatter points', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await page.locator('#correl-btn').click();
    await expect(page.locator('#correlation-view')).toHaveClass(/visible/);

    const pointCount = await page.evaluate(() => {
      return document.querySelectorAll('#scatter-svg circle').length;
    });
    expect(pointCount).toBeGreaterThan(30);

    await page.locator('#correl-trend').uncheck();
    await expect(page.locator('#corr-stats')).not.toContainText('R²');

    await page.locator('#correl-trend').check();
    await expect(page.locator('#corr-stats')).toContainText('R²');
  });

  test('history modal opens from sparkline and supports zoom controls', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await searchAndPick(page, 'Brazil', 'BRA');
    await page.locator('#expand-history').click();

    await expect(page.locator('#history-modal')).toHaveClass(/visible/);
    await expect(page.locator('#history-modal-title')).toContainText('Brazil');

    await page.locator('.zoom-btn[data-years="3"]').click();
    await expect(page.locator('.zoom-btn[data-years="3"]')).toHaveClass(/active/);

    await page.locator('#history-modal-close').click();
    await expect(page.locator('#history-modal')).not.toHaveClass(/visible/);
  });

  test('history modal world/region reference toggles affect rendered guides', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await searchAndPick(page, 'Brazil', 'BRA');
    await page.locator('#expand-history').click();
    await expect(page.locator('#history-modal')).toHaveClass(/visible/);

    await expect(page.locator('#history-chart-svg .ref-world')).toHaveCount(1);
    await expect(page.locator('#history-chart-svg .ref-region')).toHaveCount(1);

    await page.locator('#toggle-region-ref').uncheck();
    await expect(page.locator('#history-chart-svg .ref-region')).toHaveCount(0);

    await page.locator('#toggle-world-ref').uncheck();
    await expect(page.locator('#history-chart-svg .ref-world')).toHaveCount(0);
  });

  test('currency selector changes value rendering for currency-based indicators', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await searchAndPick(page, 'Brazil', 'BRA');

    const usdValue = await page.locator('#detail-card .metric-value').textContent();
    await page.locator('#currency-select').selectOption('EUR');
    const eurValue = await page.locator('#detail-card .metric-value').textContent();

    expect(usdValue).not.toEqual(eurValue);
    expect(eurValue).toContain('€');
  });

  test('currency selector does not change non-currency indicators', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await searchAndPick(page, 'Brazil', 'BRA');
    await page.locator('[data-mode="unemployment"]').click();

    const baseValue = await page.locator('#detail-card .metric-value').textContent();
    await page.locator('#currency-select').selectOption('EUR');
    const eurValue = await page.locator('#detail-card .metric-value').textContent();
    await page.locator('#currency-select').selectOption('JPY');
    const jpyValue = await page.locator('#detail-card .metric-value').textContent();

    expect(eurValue).toEqual(baseValue);
    expect(jpyValue).toEqual(baseValue);
  });

  test('offline and online events update cached-data status visibility', async ({ page }) => {
    await page.addInitScript(() => {
      let onlineState = true;
      Object.defineProperty(Navigator.prototype, 'onLine', {
        configurable: true,
        get() {
          return onlineState;
        },
      });

      window.__setOnlineState = value => {
        onlineState = !!value;
        window.dispatchEvent(new Event(onlineState ? 'online' : 'offline'));
      };
    });

    await page.goto(APP_URL);
    await waitForAppReady(page);

    await page.evaluate(() => window.__setOnlineState(false));
    await expect(page.locator('#status-offline')).toBeVisible();

    await page.evaluate(() => window.__setOnlineState(true));
    await expect(page.locator('#status-offline')).toBeHidden();
  });

  test('restores comparison and group state from URL hash parameters', async ({ page }) => {
    await page.goto(`${APP_URL}#mode=inflation&country=BRA,AUS&group=G7`);
    await waitForAppReady(page);

    await expect(page.locator('[data-mode="inflation"]')).toHaveClass(/active/);
    await expect(page.locator('#group-selector')).toHaveValue('G7');
    await expect(page.locator('#comparison-panel .cmp-row')).toHaveCount(2);
  });

  test('keyboard shortcuts support focus search and clear selection', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await page.keyboard.press('/');
    await expect(page.locator('#search-input')).toBeFocused();

    await searchAndPick(page, 'Brazil', 'BRA');
    await page.keyboard.press('Escape');
    await expect(page.locator('#detail-card')).toContainText('Click any country');
  });

  test('keyboard navigation moves between map countries and selects with Enter', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    const firstCountry = page.locator('path.country').first();
    await firstCountry.focus();
    const firstA3 = await firstCountry.getAttribute('data-a3');

    await page.keyboard.press('ArrowRight');
    const focusedA3 = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-a3'));

    expect(focusedA3).toBeTruthy();
    expect(focusedA3).not.toEqual(firstA3);

    await page.keyboard.press('Enter');
    await expect(page.locator('#detail-card .country-code')).toContainText(String(focusedA3));
  });
});
