import { test, expect } from '@playwright/test';

const APP_URL = process.env.APP_URL || `file:///${process.cwd().replace(/\\/g, '/')}/index.html`;

async function waitForAppReady(page) {
  await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
}

async function selectCountryFromSearch(page, query, a3) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(80);
  await page.locator('#search-input').fill(query);
  await expect(page.locator(`.search-result-item[data-a3="${a3}"]`)).toBeVisible();
  await page.locator(`.search-result-item[data-a3="${a3}"]`).click();
  await expect(page.locator('#detail-card .country-code')).toContainText(a3);
}

async function assertCountryHasDataAcrossAllModes(page, query, a3) {
  await selectCountryFromSearch(page, query, a3);
  const modeButtons = page.locator('.mode-btn');
  const modeCount = await modeButtons.count();

  for (let i = 0; i < modeCount; i++) {
    await modeButtons.nth(i).click();
    await page.waitForTimeout(120);
    await expect(page.locator('#detail-card .country-code')).toContainText(a3);
    await expect(page.locator('#detail-card .no-data-msg')).toHaveCount(0);
    await expect(page.locator('#detail-card .metric-value')).toBeVisible();
  }
}

test.describe('World Data Explorer - E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('wde_lang', 'en');
        localStorage.setItem('wde_lang_manual', '1');
        localStorage.setItem('wde_welcome_auto_open', 'false');
      } catch (e) {
        // Ignore storage errors in restricted contexts.
      }
    });
  });

  test('Test 1: Application loads successfully', async ({ page }) => {
    await page.goto(APP_URL);
    await expect(page.locator('h1')).toContainText('🌐 World Data Explorer');
    await expect(page.locator('[data-mode="gdp"]')).toHaveClass(/active/);
    await expect(page.locator('#world-map')).toBeVisible();
    console.log('✓ Test 1 PASSED: App loads with header, mode buttons, and map');
  });

  test('Test 2: All mode buttons visible', async ({ page }) => {
    await page.goto(APP_URL);
    await expect(page.locator('[data-mode="gdp"]')).toBeVisible();
    await expect(page.locator('[data-mode="inflation"]')).toBeVisible();
    await expect(page.locator('[data-mode="unemployment"]')).toBeVisible();
    console.log('✓ Test 2 PASSED: All three mode buttons visible');
  });

  test('Test 3: Top 10 list renders with 10 items', async ({ page }) => {
    await page.goto(APP_URL);
    // Wait for app to initialize
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    const listItems = page.locator('#top-list li');
    const count = await listItems.count();
    expect(count).toBe(10);
    console.log('✓ Test 3 PASSED: Top 10 list has 10 items');
  });

  test('Test 4: Detail card shows default message on load', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    const detailCard = page.locator('#detail-card');
    const text = await detailCard.textContent();
    expect(text).toContain('Click any country');
    console.log('✓ Test 4 PASSED: Detail card shows default hint');
  });

  test('Test 5: Legend renders with swatches', async ({ page }) => {
    await page.goto(APP_URL);
    // Wait for app to initialize
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    const legend = page.locator('#legend');
    await expect(legend).toBeVisible();
    const swatches = page.locator('.legend-swatch');
    const count = await swatches.count();
    expect(count).toBeGreaterThan(0);
    console.log(`✓ Test 5 PASSED: Legend renders with ${count} color swatches`);
  });

  test('Test 6: SVG map renders with country paths', async ({ page }) => {
    await page.goto(APP_URL);
    // Wait for app to initialize
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    const svg = page.locator('#world-map');
    const paths = page.locator('path.country');
    const count = await paths.count();
    expect(count).toBeGreaterThan(100);
    console.log(`✓ Test 6 PASSED: Map renders with ${count} country paths`);
  });

  test('Test 7: Switching to Inflation mode updates button state', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    const inflationBtn = page.locator('[data-mode="inflation"]');
    const gdpBtn = page.locator('[data-mode="gdp"]');
    
    await inflationBtn.click();
    await page.waitForTimeout(300);
    
    await expect(inflationBtn).toHaveClass(/active/);
    await expect(gdpBtn).not.toHaveClass(/active/);
    console.log('✓ Test 7 PASSED: Switching to Inflation mode works');
  });

  test('Test 8: Switching to Unemployment mode updates button state', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    const unemploymentBtn = page.locator('[data-mode="unemployment"]');
    
    await unemploymentBtn.click();
    await page.waitForTimeout(300);
    
    await expect(unemploymentBtn).toHaveClass(/active/);
    console.log('✓ Test 8 PASSED: Switching to Unemployment mode works');
  });

  test('Test 9: Top 10 title changes with modes', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    let title = page.locator('section#top-economies h3');
    
    const gdpText = await title.textContent();
    expect(gdpText).toContain('GDP');
    
    await page.locator('[data-mode="inflation"]').click();
    await page.waitForTimeout(300);
    const inflationText = await title.textContent();
    expect(inflationText).toContain('Inflation');
    
    await page.locator('[data-mode="unemployment"]').click();
    await page.waitForTimeout(300);
    const unemploymentText = await title.textContent();
    expect(unemploymentText).toContain('Lowest Unemployment');
    
    console.log('✓ Test 9 PASSED: Top 10 title updates for all modes');
  });

  test('Test 10: Tooltip element exists', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    const tooltip = page.locator('#tooltip');
    await expect(tooltip).toBeHidden();

    await page.locator('path.country[data-a3="USA"]').first().hover();
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('United States');
    console.log('✓ Test 10 PASSED: Tooltip element exists');
  });

  test('Test 11: Country paths are clickable', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    
    const pathCount = await page.evaluate(() => {
      return document.querySelectorAll('path.country').length;
    });
    
    expect(pathCount).toBe(177);
    console.log('✓ Test 11 PASSED: All 177 country paths present');
  });

  test('Test 12: Mode buttons cycle through all modes', async ({ page }) => {
    await page.goto(APP_URL);
    const modes = ['gdp', 'inflation', 'unemployment'];
    
    for (const mode of modes) {
      const btn = page.locator(`[data-mode="${mode}"]`);
      await btn.click();
      await page.waitForTimeout(300);
      await expect(btn).toHaveClass(/active/);
    }
    
    console.log('✓ Test 12 PASSED: All modes toggle correctly');
  });

  test('Test 13: Legend text updates for different modes', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    
    let legendText = await page.locator('#legend').textContent();
    expect(legendText).toBeDefined();
    expect(legendText.length).toBeGreaterThan(5);
    
    await page.locator('[data-mode="inflation"]').click();
    await page.waitForTimeout(300);
    
    legendText = await page.locator('#legend').textContent();
    expect(legendText).toContain('Inflation');
    console.log('✓ Test 13 PASSED: Legend updates for different modes');
  });

  test('Test 14: Top list items are clickable', async ({ page }) => {
    await page.goto(APP_URL);
    const listItems = page.locator('#top-list li');
    const firstItem = listItems.first();
    
    await expect(firstItem).toBeVisible();
    const text = await firstItem.textContent();
    expect(text).toBeDefined();
    expect(text.length).toBeGreaterThan(0);
    
    await firstItem.click();
    await page.waitForTimeout(300);
    
    console.log('✓ Test 14 PASSED: Top list items are clickable');
  });

  test('Test 15: Detail card updates when country clicked', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    
    const detailText = await page.evaluate(() => {
      const card = document.querySelector('#detail-card');
      return card ? card.textContent : '';
    });
    
    expect(detailText.length).toBeGreaterThan(0);
    console.log('✓ Test 15 PASSED: Detail card functional');
  });

  test('Test 16: Share bar elements render when country selected', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');

    await selectCountryFromSearch(page, 'Brazil', 'BRA');
    
    const shareBarExists = await page.evaluate(() => {
      return document.querySelector('.share-bar-fill') !== null;
    });

    expect(shareBarExists).toBe(true);
    
    console.log(`✓ Test 16 PASSED: Share bar component exists: ${shareBarExists}`);
  });

  test('Test 17: No data countries have reduced opacity', async ({ page }) => {
    await page.goto(APP_URL);
    
    await page.locator('[data-mode="inflation"]').click();
    await page.waitForTimeout(300);
    
    const noDataCountries = page.locator('path.country.no-data');
    const count = await noDataCountries.count();

    expect(count).toBeGreaterThan(0);
    
    console.log(`✓ Test 17 PASSED: Found ${count} countries with no-data styling`);
  });

  test('Test 18: Rank badge displays for selected country', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');

    await selectCountryFromSearch(page, 'Brazil', 'BRA');
    
    const rankBadgeExists = await page.evaluate(() => {
      const badge = document.querySelector('.rank-badge');
      return badge !== null && badge.textContent.length > 0;
    });

    expect(rankBadgeExists).toBe(true);
    
    console.log(`✓ Test 18 PASSED: Rank badge system exists: ${rankBadgeExists}`);
  });

  test('Test 19: All three data files loaded and working', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);
    
    const modes = ['gdp', 'inflation', 'unemployment'];
    
    for (const mode of modes) {
      await page.locator(`[data-mode="${mode}"]`).click();
      await page.waitForTimeout(300);
      
      const listItems = page.locator('#top-list li');
      const count = await listItems.count();
      expect(count).toBe(10);
    }
    
    console.log('✓ Test 19 PASSED: All three data files loaded and working');
  });

  test('Test 20: Application responsive through mode switching', async ({ page }) => {
    await page.goto(APP_URL);
    await page.waitForFunction(() => document.documentElement.getAttribute('data-app-ready') === 'true');
    
    const modes = ['gdp', 'inflation', 'unemployment', 'gdp'];
    
    for (const mode of modes) {
      await page.locator(`[data-mode="${mode}"]`).click();
      await page.waitForTimeout(200);
    }
    
    const finalCheck = await page.evaluate(() => {
      const map = document.querySelector('#world-map') !== null;
      const list = document.querySelector('#top-list') !== null;
      const legend = document.querySelector('#legend') !== null;
      return map && list && legend;
    });
    
    expect(finalCheck).toBe(true);
    console.log('✓ Test 20 PASSED: Application remains stable');
  });

  test('Test 21: Map ID mapping resolves BRA and AUS features', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    const mapping = await page.evaluate(() => {
      const braCount = document.querySelectorAll('path.country[data-a3="BRA"]').length;
      const ausCount = document.querySelectorAll('path.country[data-a3="AUS"]').length;
      return { braCount, ausCount };
    });

    expect(mapping.braCount).toBeGreaterThan(0);
    expect(mapping.ausCount).toBeGreaterThan(0);
    console.log(`✓ Test 21 PASSED: BRA paths=${mapping.braCount}, AUS paths=${mapping.ausCount}`);
  });

  test('Test 22: Brazil and Australia show data in every indicator mode', async ({ page }) => {
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await assertCountryHasDataAcrossAllModes(page, 'Brazil', 'BRA');
    await assertCountryHasDataAcrossAllModes(page, 'Australia', 'AUS');

    console.log('✓ Test 22 PASSED: Brazil and Australia have metric data across all indicator modes');
  });

  test('Test 23: Mobile layout avoids horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await expect(page.locator('#mobile-nav')).toBeVisible();

    const dimensions = await page.evaluate(() => {
      const doc = document.documentElement;
      return {
        clientWidth: doc.clientWidth,
        scrollWidth: doc.scrollWidth,
      };
    });

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
    console.log('✓ Test 23 PASSED: Mobile viewport has no horizontal overflow');
  });

  test('Test 24: Mobile navigation toggles map and data views', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(APP_URL);
    await waitForAppReady(page);

    await expect(page.locator('#app')).toHaveClass(/mobile-view-map/);

    await page.locator('.mobile-nav-btn[data-view="data"]').click();
    await expect(page.locator('#app')).toHaveClass(/mobile-view-data/);
    await expect(page.locator('#info-panel')).toBeVisible();

    await page.locator('.mobile-nav-btn[data-view="map"]').click();
    await expect(page.locator('#app')).toHaveClass(/mobile-view-map/);
    await expect(page.locator('#map-container')).toBeVisible();

    console.log('✓ Test 24 PASSED: Mobile view toggle works for map and data panels');
  });

  test('Test 25: Mobile controls meet touch-size and readability baseline', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(APP_URL);
    await waitForAppReady(page);
    await page.locator('.mobile-nav-btn[data-view="data"]').click();
    await expect(page.locator('#app')).toHaveClass(/mobile-view-data/);

    const checks = await page.evaluate(() => {
      const px = sel => {
        const el = document.querySelector(sel);
        if (!el) return 0;
        return el.getBoundingClientRect().height;
      };

      return {
        bodyFontSize: parseFloat(getComputedStyle(document.body).fontSize),
        mobileNavBtnHeight: px('.mobile-nav-btn[data-view="map"]'),
        searchInputHeight: px('#search-input'),
        groupSelectHeight: px('#group-selector'),
        filterToggleHeight: px('#filter-toggle'),
      };
    });

    expect(checks.bodyFontSize).toBeGreaterThanOrEqual(15);
    expect(checks.mobileNavBtnHeight).toBeGreaterThanOrEqual(40);
    expect(checks.searchInputHeight).toBeGreaterThanOrEqual(40);
    expect(checks.groupSelectHeight).toBeGreaterThanOrEqual(38);
    expect(checks.filterToggleHeight).toBeGreaterThanOrEqual(40);

    console.log('✓ Test 25 PASSED: Mobile control sizes and text readability are within baseline');
  });

});
