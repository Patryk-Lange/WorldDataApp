/* ============================================================
   World Data Explorer – app.js
   Architecture: Event-driven, registry-based, IIFE-scoped.
   All feature behaviour derives from INDICATORS config.
   Requires: D3 v7, TopoJSON client, config.js, eventbus.js,
             countries.js, all data/*.js files.
   ============================================================ */
(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────
     Constants
  ────────────────────────────────────────────────────────── */
  const WORLD_TOPO_URL = window.location.protocol === 'file:'
    ? 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json'
    : 'assets/world/countries-110m.json';

  const COLOR_NO_DATA  = '#374151';
  const COLOR_SELECTED = '#3b82f6';
  const COLOR_BETTER   = '#22c55e';
  const COLOR_WORSE    = '#ef4444';
  const COLOR_NEUTRAL  = '#6b7280';  // for null higherIsBetter
  const COLOR_BORDER   = '#1f2937';
  const COLOR_OCEAN    = '#0f172a';

  // Comparison slot colours (up to 5 countries)
  const CMP_COLORS = ['#3b82f6','#a855f7','#f97316','#14b8a6','#ef4444'];

  const MAX_BOOKMARKS   = 10;
  const MAX_COMPARISON  = 5;
  const STORAGE_KEYS = {
    bookmarks: 'wde_bookmarks',
    thresholdPrefix: 'wde_thresh_',
    welcomeAutoOpen: 'wde_welcome_auto_open',
  };
  const MOBILE_BREAKPOINT = 768;
  const TOUCH_POINTER_MEDIA = window.matchMedia('(hover: none), (pointer: coarse)');
  const I18N = window.WDE_I18N || null;
  const INDICATOR_GROUP_KEYS = {
    Economy: 'indicatorGroups.economy',
    Society: 'indicatorGroups.society',
    Environment: 'indicatorGroups.environment',
  };
  const REGION_LABEL_KEYS = {
    'North America': 'groups.northAmerica',
    Caribbean: 'groups.caribbean',
    'South America': 'groups.southAmerica',
    'Western Europe': 'groups.westernEurope',
    'Eastern Europe': 'groups.easternEurope',
    'Middle East': 'groups.middleEast',
    'Central Asia': 'groups.centralAsia',
    'South Asia': 'groups.southAsia',
    'East Asia': 'groups.eastAsia',
    'Southeast Asia': 'groups.southeastAsia',
    Oceania: 'groups.oceania',
    'North Africa': 'groups.northAfrica',
    'Sub-Saharan Africa': 'groups.subSaharanAfrica',
    G7: 'groups.g7',
    G20: 'groups.g20',
    'EU-27': 'groups.eu27',
    'BRICS+': 'groups.bricsPlus',
    ASEAN: 'groups.asean',
    NATO: 'groups.nato',
    'OPEC+': 'groups.opecPlus',
  };

  /* ──────────────────────────────────────────────────────────
     State
  ────────────────────────────────────────────────────────── */
  let currentIndicator = INDICATORS[0];       // full indicator object
  let selectedA3       = null;                // single selected A3
  let comparisonA3s    = [];                  // ordered array of compared A3s
  let comparisonMode   = false;               // ≥2 countries selected
  let bookmarks        = new Set();           // A3 codes
  let activeGroupFilter = null;               // region/group name or null
  let filterMin        = null;
  let filterMax        = null;
  let thresholdMode    = 'relative';          // 'relative' | 'absolute'
  let thresholdValue   = 20;                  // % difference for relative, abs value for absolute
  let activeCurrency   = CURRENCIES[0];       // default USD
  let correlX          = INDICATORS[0];
  let correlY          = INDICATORS[2];
  let showTrendLine    = true;
  let showOutliers     = true;
  let showWorldRef     = true;
  let showRegionRef    = true;
  let mobileView       = 'map';              // mobile-only main view: map|data
  let zoomTransform    = d3.zoomIdentity;
  let worldFeatures    = null;                // TopoJSON features cache
  let zoom             = null;               // D3 zoom behaviour
  let svgG             = null;               // main SVG group
  let pathFn           = null;               // geo path function
  let deferredInstallPrompt = null;
  let toastTimer = null;
  let legendOutsideClickHandler = null;
  let pendingWatchlistClearUntil = 0;

  // Pre-computed data caches per indicator: { a3: value }
  const dataCache  = {};   // dataCache['gdp'] = { USA: 29185000, ... }
  const rankCache  = {};   // rankCache['gdp'] = { USA: 1, CHN: 2, ... }
  const statCache  = {};   // statCache['gdp'] = { total, avg, stdDev, sortedEntries }

  // Build a forgiving lookup so map IDs like "076", "76", and 76 resolve the same.
  const ISO_NUM_TO_A3_LOOKUP = buildCountryIdLookup(ISO_NUM_TO_A3);

  /* ──────────────────────────────────────────────────────────
     Currency helpers
  ────────────────────────────────────────────────────────── */
  // Convert a raw USD value to the active display currency (only for currencyBased indicators)
  function cvt(val, ind) {
    if (!ind.currencyBased) return val;
    return val * activeCurrency.rate;
  }

  // Format a value for display – applies currency conversion + symbol for monetary indicators
  function fmtVal(ind, val) {
    if (!ind.currencyBased) return ind.format(val);
    const converted = val * activeCurrency.rate;
    return ind.format(converted, activeCurrency.symbol);
  }

  function t(key, params, fallback) {
    if (I18N && typeof I18N.t === 'function') return I18N.t(key, params || {}, fallback || key);
    return fallback || key;
  }

  function fmtNumber(value, options) {
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    if (I18N && typeof I18N.formatNumber === 'function') return I18N.formatNumber(num, options || {});
    return num.toLocaleString(undefined, options || {});
  }

  function stripEmoji(text) {
    return String(text || '').replace(/\p{Emoji_Presentation}/gu, '').trim();
  }

  function indicatorLabel(ind) {
    return t(`indicators.${ind.id}.label`, {}, ind.label);
  }

  function indicatorPlainLabel(ind) {
    return t(`indicators.${ind.id}.plainLabel`, {}, stripEmoji(ind.label));
  }

  function indicatorTopLabel(ind) {
    return t(`indicators.${ind.id}.topLabel`, {}, ind.topLabel);
  }

  function indicatorSource(ind) {
    return t(`indicators.${ind.id}.source`, {}, ind.source);
  }

  function indicatorAsOf(ind) {
    return t(`indicators.${ind.id}.asOf`, {}, ind.asOf);
  }

  function indicatorUnit(ind) {
    return t(`indicators.${ind.id}.unit`, {}, ind.unit || '');
  }

  function indicatorGroupLabel(group) {
    const key = INDICATOR_GROUP_KEYS[group];
    return key ? t(key, {}, group) : group;
  }

  function regionLabel(regionName) {
    const key = REGION_LABEL_KEYS[regionName];
    return key ? t(key, {}, regionName) : regionName;
  }

  function getLocalizedCountryRegion(a3) {
    const regionName = getCountryRegion(a3);
    return regionName ? regionLabel(regionName) : null;
  }

  function buildCountryIdLookup(sourceMap) {
    const lookup = Object.create(null);
    Object.entries(sourceMap || {}).forEach(([id, a3]) => {
      if (!a3) return;
      const raw = String(id).trim();
      const n = Number(raw);
      lookup[raw] = a3;
      if (Number.isFinite(n)) {
        const canonical = String(Math.trunc(n));
        lookup[canonical] = a3;
        lookup[canonical.padStart(3, '0')] = a3;
      }
    });
    return lookup;
  }

  function resolveCountryA3(countryId) {
    if (countryId === null || countryId === undefined) return null;
    const raw = String(countryId).trim();
    if (!raw) return null;
    return ISO_NUM_TO_A3_LOOKUP[raw] || null;
  }

  function hasFiniteValue(val) {
    return Number.isFinite(val);
  }

  function escapeHtml(text) {
    return String(text).replace(/[&<>"']/g, ch => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[ch]));
  }

  function readStorageJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (err) {
      console.warn('Storage read failed for key', key, err);
      return fallback;
    }
  }

  function writeStorageJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn('Storage write failed for key', key, err);
      return false;
    }
  }

  function showToast(message, level) {
    const text = String(message || '').trim();
    if (!text || !appToast) return;

    if (toastTimer) {
      clearTimeout(toastTimer);
      toastTimer = null;
    }

    appToast.textContent = text;
    appToast.classList.toggle('warn', level === 'warn');
    appToast.classList.add('visible');

    toastTimer = setTimeout(() => {
      appToast.classList.remove('visible', 'warn');
      toastTimer = null;
    }, 2800);
  }

  function isTouchPointer() {
    return TOUCH_POINTER_MEDIA.matches;
  }

  function isMobileViewport() {
    return window.innerWidth <= MOBILE_BREAKPOINT;
  }

  function setMobileView(view) {
    if (!appRoot || !mobileNav) return;
    mobileView = view === 'data' ? 'data' : 'map';
    appRoot.classList.toggle('mobile-view-map', mobileView === 'map');
    appRoot.classList.toggle('mobile-view-data', mobileView === 'data');

    mobileNav.querySelectorAll('.mobile-nav-btn[data-view]').forEach(btn => {
      const active = btn.dataset.view === mobileView;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  function applyResponsiveViewMode() {
    if (!appRoot || !mobileNav) return;
    if (isMobileViewport()) {
      setMobileView(mobileView);
      return;
    }
    appRoot.classList.remove('mobile-view-map', 'mobile-view-data');
  }

  function setupMobileNavigation() {
    if (!mobileNav) return;

    mobileNav.querySelectorAll('.mobile-nav-btn[data-view]').forEach(btn => {
      btn.addEventListener('click', () => setMobileView(btn.dataset.view));
    });

    let resizeTimer = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(applyResponsiveViewMode, 100);
    });

    applyResponsiveViewMode();
  }

  function setupLanguageSelector() {
    const sel = document.getElementById('language-select');
    if (!sel || !I18N) return;

    const locales = typeof I18N.getSupportedLocales === 'function'
      ? I18N.getSupportedLocales()
      : ['en', 'pl'];

    const previous = sel.value;
    sel.innerHTML = '';
    locales.forEach(code => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = t(`languages.${code}`, {}, code.toUpperCase());
      sel.appendChild(opt);
    });

    const active = typeof I18N.getLocale === 'function' ? I18N.getLocale() : 'en';
    sel.value = locales.includes(previous) ? previous : active;

    if (sel.dataset.bound !== '1') {
      sel.addEventListener('change', function () {
        if (!I18N || typeof I18N.setLocale !== 'function') return;
        I18N.setLocale(this.value, { manual: true, persist: true });
      });
      sel.dataset.bound = '1';
    }

    if (!setupLanguageSelector._subscribed && typeof I18N.onLocaleChange === 'function') {
      I18N.onLocaleChange(locale => {
        sel.value = locale;
        refreshLocalizedUI();
      });
      setupLanguageSelector._subscribed = true;
    }
  }

  function isStandaloneDisplayMode() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  function updateInstallButtonState() {
    if (!installBtn) return;
    const canInstall = !!deferredInstallPrompt && !isStandaloneDisplayMode();
    installBtn.classList.toggle('is-hidden', !canInstall);
    installBtn.setAttribute('aria-hidden', canInstall ? 'false' : 'true');
    installBtn.disabled = !canInstall;
  }

  function setupPWA() {
    if ('serviceWorker' in navigator && window.isSecureContext && window.location.protocol !== 'file:') {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(err => {
          console.warn('Service worker registration failed', err);
        });
      });
    }

    if (!installBtn || setupPWA._bound) return;

    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      deferredInstallPrompt = event;
      updateInstallButtonState();
    });

    window.addEventListener('appinstalled', () => {
      deferredInstallPrompt = null;
      updateInstallButtonState();
      showToast(t('pwa.installed', {}, 'App installed successfully.'));
    });

    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) {
        showToast(t('pwa.notAvailable', {}, 'Install option is not available yet.'), 'warn');
        return;
      }

      try {
        deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          showToast(t('pwa.installing', {}, 'Installing app...'));
        }
      } catch (err) {
        console.warn('Install prompt failed', err);
        showToast(t('pwa.installFailed', {}, 'Could not launch installation prompt.'), 'warn');
      } finally {
        deferredInstallPrompt = null;
        updateInstallButtonState();
      }
    });

    updateInstallButtonState();
    setupPWA._bound = true;
  }

  function refreshLocalizedUI() {
    if (I18N && typeof I18N.applyTranslations === 'function') {
      I18N.applyTranslations(document);
    }

    setupLanguageSelector();
    populateCurrencyOptions();
    populateGroupOptions();
    populateCorrelationAxisOptions();

    buildIndicatorTabs();
    loadThresholds();
    buildLegend();
    buildTopList();
    updateStatusBar();

    if (filterMin !== null || filterMax !== null) {
      applyValueFilter();
    }

    renderWatchlist();

    if (comparisonMode) showComparisonPanel();
    else if (selectedA3) updateDetailCard(selectedA3);
    else showDefaultCard();

    if (correlView && correlView.classList.contains('visible')) {
      renderCorrelation();
    }

    if (histModal.classList.contains('visible') && histModal._currentA3) {
      const activeZoomBtn = document.querySelector('.zoom-btn.active');
      const years = activeZoomBtn ? parseInt(activeZoomBtn.dataset.years || '10', 10) : 10;
      updateHistoryModalHeader(histModal._currentA3, histModal._currentIndId);
      renderHistoryChart(histModal._currentA3, histModal._currentIndId, years);
    }

    updateAriaLabels();
  }

  /* ──────────────────────────────────────────────────────────
     DOM refs
  ────────────────────────────────────────────────────────── */
  const mapContainer   = document.getElementById('map-container');
  const tooltipEl      = document.getElementById('tooltip');
  const detailCard     = document.getElementById('detail-card');
  const legendEl       = document.getElementById('legend');
  const searchInput    = document.getElementById('search-input');
  const searchResults  = document.getElementById('search-results');
  const groupSelector  = document.getElementById('group-selector');
  const filterPanel    = document.getElementById('filter-panel');
  const filterToggle   = document.getElementById('filter-toggle');
  const filterBody     = document.getElementById('filter-body');
  const filterMinInput = document.getElementById('filter-min');
  const filterMaxInput = document.getElementById('filter-max');
  const filterChips    = document.getElementById('filter-chips');
  const compPanel      = document.getElementById('comparison-panel');
  const cmpBarChart    = document.getElementById('cmp-bar-chart');
  const watchlistBody  = document.getElementById('watchlist-body');
  const statusSource   = document.getElementById('status-source');
  const appToast       = document.getElementById('app-toast');
  const histModal      = document.getElementById('history-modal');
  const historyCloseBtn = document.getElementById('history-modal-close');
  const shareModal     = document.getElementById('share-modal');
  const shareCloseBtn  = document.getElementById('share-modal-close');
  const installBtn     = document.getElementById('install-btn');
  const welcomeModal   = document.getElementById('welcome-modal');
  const welcomeOpenBtn = document.getElementById('welcome-open-btn');
  const welcomeCloseBtn = document.getElementById('welcome-modal-close');
  const welcomeContinueBtn = document.getElementById('welcome-continue-btn');
  const welcomeDontShow = document.getElementById('welcome-dont-show');
  const correlView     = document.getElementById('correlation-view');
  const appRoot        = document.getElementById('app');
  const mobileNav      = document.getElementById('mobile-nav');

  /* ──────────────────────────────────────────────────────────
     Initialisation
  ────────────────────────────────────────────────────────── */
  function init() {
    if (I18N && typeof I18N.applyTranslations === 'function') {
      I18N.applyTranslations(document);
    }

    loadBookmarks();
    setupLanguageSelector();
    buildIndicatorTabs();
    setupSearch();
    setupGroupSelector();
    setupFilterPanel();
    setupCurrencySelector();
    setupShareBtn();
    setupWelcomeModal();
    setupExportBtn();
    setupHistoryModal();
    setupCorrelationView();
    setupWatchlist();
    setupKeyboardShortcuts();
    setupMobileNavigation();
    setupPWA();

    d3.json(WORLD_TOPO_URL).then(function (world) {
      // Pre-compute all indicator data
      INDICATORS.forEach(precomputeIndicator);

      // Build map
      buildMap(world);

      // Initial render
      refreshLocalizedUI();

      // Restore URL state
      restoreURLState();

      // Show welcome guide automatically unless user disabled auto-open.
      maybeShowWelcomeModal();

      // Mark ready for E2E tests
      document.documentElement.setAttribute('data-app-ready', 'true');
    }).catch(function (err) {
      console.error('Failed to load world topology:', err);
      detailCard.innerHTML = `
        <p class="error">${escapeHtml(t('errors.mapLoad', {}, 'Failed to load map data. Check your connection.'))}</p>
        <button class="deselect-btn" id="retry-map-load">${escapeHtml(t('errors.retryLoad', {}, 'Retry loading'))}</button>
      `;
      const retryBtn = document.getElementById('retry-map-load');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => window.location.reload());
      }
    });
  }

  /* ──────────────────────────────────────────────────────────
     Data variable registry (const globals not on window)
  ────────────────────────────────────────────────────────── */
  const DATA_VARS = {
    GDP_DATA:             typeof GDP_DATA !== 'undefined'             ? GDP_DATA             : null,
    GDP_PER_CAPITA_DATA:  typeof GDP_PER_CAPITA_DATA !== 'undefined'  ? GDP_PER_CAPITA_DATA  : null,
    INFLATION_DATA:       typeof INFLATION_DATA !== 'undefined'       ? INFLATION_DATA       : null,
    UNEMPLOYMENT_DATA:    typeof UNEMPLOYMENT_DATA !== 'undefined'    ? UNEMPLOYMENT_DATA    : null,
    POPULATION_DATA:      typeof POPULATION_DATA !== 'undefined'      ? POPULATION_DATA      : null,
    LIFE_EXPECTANCY_DATA: typeof LIFE_EXPECTANCY_DATA !== 'undefined' ? LIFE_EXPECTANCY_DATA : null,
    GINI_DATA:            typeof GINI_DATA !== 'undefined'            ? GINI_DATA            : null,
    CO2_DATA:             typeof CO2_DATA !== 'undefined'             ? CO2_DATA             : null,
    TRADE_BALANCE_DATA:   typeof TRADE_BALANCE_DATA !== 'undefined'   ? TRADE_BALANCE_DATA   : null,
    DEBT_TO_GDP_DATA:     typeof DEBT_TO_GDP_DATA !== 'undefined'     ? DEBT_TO_GDP_DATA     : null,
  };

  /* ──────────────────────────────────────────────────────────
     Data pre-computation
  ────────────────────────────────────────────────────────── */
  function precomputeIndicator(ind) {
    const raw = DATA_VARS[ind.dataVar];
    if (!raw) { dataCache[ind.id] = {}; rankCache[ind.id] = {}; statCache[ind.id] = {}; return; }

    const data = {};
    Object.entries(raw).forEach(([k, v]) => {
      if (typeof v === 'number' && isFinite(v)) data[k] = v;
    });
    dataCache[ind.id] = data;

    // Sort: for topOrder 'asc' best is smallest, rank 1 = smallest
    const entries = Object.entries(data);
    const sorted = [...entries].sort(([,a],[,b]) =>
      ind.topOrder === 'asc' ? a - b : b - a
    );

    // Rank: rank 1 = best (lowest for asc, highest for desc)
    const ranks = {};
    sorted.forEach(([a3], i) => { ranks[a3] = i + 1; });
    rankCache[ind.id] = ranks;

    // Stats
    const vals = entries.map(([,v]) => v).filter(v => Number.isFinite(v));
    const total = vals.reduce((s, v) => s + v, 0);
    const avg = vals.length ? total / vals.length : 0;
    const variance = vals.length ? vals.reduce((s,v) => s + (v-avg)**2, 0) / vals.length : 0;
    const stdDev = Math.sqrt(variance);

    statCache[ind.id] = { total, avg, stdDev, sortedEntries: sorted };
  }

  /* ──────────────────────────────────────────────────────────
     Map building
  ────────────────────────────────────────────────────────── */
  function buildMap(world) {
    worldFeatures = topojson.feature(world, world.objects.countries).features;
    const countriesWithAnyData = new Set();
    Object.values(dataCache).forEach(dataset => {
      Object.keys(dataset || {}).forEach(a3 => countriesWithAnyData.add(a3));
    });

    const W = mapContainer.clientWidth;
    const H = mapContainer.clientHeight;

    const projection = d3.geoNaturalEarth1()
      .scale(W / 6.5)
      .translate([W / 2, H / 2]);

    pathFn = d3.geoPath().projection(projection);

    const svg = d3.select('#world-map')
      .attr('width', W)
      .attr('height', H)
      .style('background', COLOR_OCEAN);

    // Defs (gradients)
    const defs = svg.append('defs');
    defs.append('linearGradient').attr('id', 'sparkGrad')
      .attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%')
      .call(g => {
        g.append('stop').attr('offset','0%').attr('stop-color','#38bdf8').attr('stop-opacity',0.3);
        g.append('stop').attr('offset','100%').attr('stop-color','#38bdf8').attr('stop-opacity',0);
      });
    defs.append('linearGradient').attr('id', 'histGrad')
      .attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%')
      .call(g => {
        g.append('stop').attr('offset','0%').attr('stop-color','#38bdf8').attr('stop-opacity',0.25);
        g.append('stop').attr('offset','100%').attr('stop-color','#38bdf8').attr('stop-opacity',0);
      });

    // Graticule
    svg.append('path')
      .datum(d3.geoGraticule()())
      .attr('class', 'graticule')
      .attr('d', pathFn);

    // Country group
    svgG = svg.append('g').attr('class', 'countries');

    svgG.selectAll('path.country')
      .data(worldFeatures)
      .join('path')
        .attr('class', d => {
          const a3 = resolveCountryA3(d.id);
          const hasData = a3 && countriesWithAnyData.has(a3);
          return 'country' + (hasData ? '' : ' no-data');
        })
        .attr('d', pathFn)
        .attr('data-id', d => d.id)
        .attr('data-a3', d => resolveCountryA3(d.id) || '')
        .style('fill', COLOR_NO_DATA)
        .style('stroke', COLOR_BORDER)
        .style('stroke-width', '0.4px')
        .style('cursor', 'pointer')
        .attr('role', 'button')
        .attr('tabindex', '-1')
        .on('mousemove', onMouseMove)
        .on('mouseleave', onMouseLeave)
        .on('focus', function () {
          setMapTabStop(this);
        })
        .on('click', onCountryClick);

    // Borders
    svg.append('path')
      .datum(topojson.mesh(world, world.objects.countries, (a,b) => a !== b))
      .attr('class', 'borders')
      .attr('d', pathFn);

    // Zoom
    zoom = d3.zoom()
      .scaleExtent([1, 14])
      .on('zoom', function (e) {
        zoomTransform = e.transform;
        svgG.attr('transform', e.transform);
        svg.select('.borders').attr('transform', e.transform);
        svg.select('.graticule').attr('transform', e.transform);
        const t = e.transform;
        pushURLState();
        EventBus.emit('zoomChanged', { k: t.k, x: t.x, y: t.y });
      });
    svg.call(zoom);

    // Click ocean to deselect
    svg.on('click', function (event) {
      const tgt = event.target;
      if (tgt === this || tgt.classList.contains('graticule')) {
        clearSelection();
      }
    });

    // Reset zoom button
    document.getElementById('reset-zoom').addEventListener('click', () => {
      svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
    });

    // Resize handler (debounced)
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        const nW = mapContainer.clientWidth;
        const nH = mapContainer.clientHeight;
        svg.attr('width', nW).attr('height', nH);
        projection.scale(nW / 6.5).translate([nW / 2, nH / 2]);
        const newPath = d3.geoPath().projection(projection);
        pathFn = newPath;
        svgG.selectAll('path.country').attr('d', newPath);
        svg.select('.borders').attr('d', newPath);
        svg.select('.graticule').attr('d', newPath);
      }, 150);
    });

    // Keyboard accessibility on map paths
    svgG.selectAll('path.country').on('keydown', function (event, d) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onCountryClick(event, d);
        return;
      }

      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
        return;
      }

      event.preventDefault();
      const focusableCountries = svgG.selectAll('path.country').nodes();
      const currentIdx = focusableCountries.indexOf(this);
      if (currentIdx < 0 || !focusableCountries.length) return;

      const direction = (event.key === 'ArrowLeft' || event.key === 'ArrowUp') ? -1 : 1;
      const nextIdx = (currentIdx + direction + focusableCountries.length) % focusableCountries.length;
      const nextEl = focusableCountries[nextIdx];
      if (nextEl && typeof nextEl.focus === 'function') {
        setMapTabStop(nextEl);
        nextEl.focus();
      }
    });

    const initialCountry = svgG.select('path.country').node();
    if (initialCountry) {
      setMapTabStop(initialCountry);
    }

    // Update ARIA labels
    updateAriaLabels();
  }

  function updateAriaLabels() {
    if (!svgG) return;

    svgG.selectAll('path.country').attr('aria-label', d => {
      const a3   = resolveCountryA3(d.id);
      if (!a3) return t('map.unknownTerritory', {}, 'Unknown territory');
      const name = COUNTRY_NAMES[a3] || a3;
      const val  = dataCache[currentIndicator.id] && dataCache[currentIndicator.id][a3];
      const rank = rankCache[currentIndicator.id] && rankCache[currentIndicator.id][a3];
      if (!hasFiniteValue(val)) {
        return t('map.noDataAria', { name }, `${name}: no data`);
      }
      return t('map.rankAria', {
        name,
        value: fmtVal(currentIndicator, val),
        rank: rank || '—',
      }, `${name}: ${fmtVal(currentIndicator, val)}, rank ${rank || '—'}`);
    });
  }

  /* ──────────────────────────────────────────────────────────
     Colour logic
  ────────────────────────────────────────────────────────── */
  function getCountryFill(a3, selectedValue) {
    if (!a3) return COLOR_NO_DATA;

    // Comparison mode: use slot colour
    const cmpIdx = comparisonA3s.indexOf(a3);
    if (cmpIdx >= 0) return CMP_COLORS[cmpIdx];

    if (comparisonMode) return COLOR_NEUTRAL;   // non-selected in comparison mode

    // Normal mode
    if (a3 === selectedA3) return COLOR_SELECTED;

    const data = dataCache[currentIndicator.id] || {};
    const val  = data[a3];

    // Group dimming: if a group filter is active and country not in group
    if (activeGroupFilter && REGIONS[activeGroupFilter] && !REGIONS[activeGroupFilter].includes(a3)) {
      return adjustAlpha(COLOR_NO_DATA, 0.3);
    }

    // No selection yet → flat grey
    if (!selectedA3) return COLOR_NO_DATA;

    if (!hasFiniteValue(val)) return COLOR_NO_DATA;

    const ind = currentIndicator;

    // Neutral indicator (null higherIsBetter): grey gradient scale
    if (ind.higherIsBetter === null) {
      const st  = statCache[ind.id] || {};
      const max = (st.sortedEntries && st.sortedEntries[0]) ? st.sortedEntries[0][1] : 1;
      const pct = Math.min(val / max, 1);
      return `hsl(210,20%,${20 + pct * 40}%)`;
    }

    // Threshold-based colouring
    const diff = thresholdMode === 'relative'
      ? Math.abs((val - selectedValue) / (selectedValue || 1)) * 100
      : Math.abs(val - selectedValue);

    if (diff <= thresholdValue * 0.1) return COLOR_NEUTRAL; // near-equal band

    const better = ind.higherIsBetter ? val > selectedValue : val < selectedValue;
    return better ? COLOR_BETTER : COLOR_WORSE;
  }

  function adjustAlpha(hex, a) {
    // Returns rgba for a 6-char hex
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function applyMapColors() {
    const data    = dataCache[currentIndicator.id] || {};
    const selVal  = selectedA3 && hasFiniteValue(data[selectedA3]) ? data[selectedA3] : 0;
    const bms     = bookmarks;

    svgG.selectAll('path.country')
      .style('fill', d => {
        const a3 = resolveCountryA3(d.id);
        return getCountryFill(a3, selVal);
      })
      .style('stroke', d => {
        const a3 = resolveCountryA3(d.id);
        if (a3 === selectedA3) return COLOR_BORDER;
        return COLOR_BORDER;
      })
      .style('stroke-width', '0px')
      .classed('bookmarked', d => bms.has(resolveCountryA3(d.id)));

    // Comparison slot classes
    for (let i = 0; i < MAX_COMPARISON; i++) {
      svgG.selectAll('path.country').classed(`cmp-${i}`, d => {
        return comparisonA3s[i] === resolveCountryA3(d.id);
      });
    }
  }

  function setMapTabStop(targetEl) {
    if (!svgG) return;
    const countries = svgG.selectAll('path.country').nodes();
    if (!countries.length) return;

    const activeEl = countries.includes(targetEl) ? targetEl : countries[0];
    countries.forEach(el => {
      el.setAttribute('tabindex', el === activeEl ? '0' : '-1');
    });
  }

  /* ──────────────────────────────────────────────────────────
     Map interactions
  ────────────────────────────────────────────────────────── */
  function onMouseMove(event, d) {
    if (isTouchPointer()) {
      tooltipEl.style.display = 'none';
      return;
    }

    const a3   = resolveCountryA3(d.id);
    const name = (a3 && COUNTRY_NAMES[a3]) || t('map.unknownTerritory', {}, 'Unknown territory');
    const data = dataCache[currentIndicator.id] || {};
    const val  = a3 && data[a3];
    const ind  = currentIndicator;
    const valText = hasFiniteValue(val)
      ? escapeHtml(fmtVal(ind, val))
      : `<span class="no-data-tt">${escapeHtml(t('map.tooltipNoData', {}, '⊘ No data'))}</span>`;
    const safeName = escapeHtml(name);
    const safeLabel = escapeHtml(indicatorPlainLabel(ind));

    tooltipEl.style.display = 'block';
    tooltipEl.style.left    = (event.clientX + 14) + 'px';
    tooltipEl.style.top     = (event.clientY - 36) + 'px';
    tooltipEl.innerHTML     = `<strong>${safeName}</strong><br>${safeLabel}: ${valText}`;
  }

  function onMouseLeave() {
    tooltipEl.style.display = 'none';
  }

  function onCountryClick(event, d) {
    event.stopPropagation();
    if (event.currentTarget instanceof SVGElement) {
      setMapTabStop(event.currentTarget);
    }
    const a3 = resolveCountryA3(d.id);
    if (!a3) return;

    // Apply filter check
    if (!passesFilter(a3)) return;

    if (comparisonMode || comparisonA3s.length >= 1) {
      // Multi-select mode
      const existIdx = comparisonA3s.indexOf(a3);
      if (existIdx >= 0) {
        comparisonA3s.splice(existIdx, 1);
        EventBus.emit('comparisonRemoved', { a3 });
      } else {
        if (comparisonA3s.length >= MAX_COMPARISON) {
          comparisonA3s.shift(); // remove oldest
        }
        comparisonA3s.push(a3);
        EventBus.emit('comparisonAdded', { a3 });
      }
      comparisonMode = comparisonA3s.length >= 2;
      selectedA3 = comparisonA3s.length === 1 ? comparisonA3s[0] : null;
    } else {
      // Single select
      if (selectedA3 === a3) {
        clearSelection();
        return;
      }
      selectedA3 = a3;
      comparisonA3s = [a3];
      EventBus.emit('countrySelected', { a3, numericId: d.id });
    }

    applyMapColors();
    renderSidebar();
    // Keep current mobile view when selecting directly on the map.
    pushURLState();
  }

  function clearSelection() {
    selectedA3    = null;
    comparisonA3s = [];
    comparisonMode = false;
    applyMapColors();
    showDefaultCard();
    hideComparisonPanel();
    pushURLState();
    EventBus.emit('comparisonCleared', {});
  }

  function passesCurrentValueFilter(val) {
    if (!hasFiniteValue(val)) return filterMin === null && filterMax === null;
    if (filterMin !== null && val < filterMin) return false;
    if (filterMax !== null && val > filterMax) return false;
    return true;
  }

  function passesFilter(a3) {
    const data = dataCache[currentIndicator.id] || {};
    return passesCurrentValueFilter(data[a3]);
  }

  /* ──────────────────────────────────────────────────────────
     Sidebar rendering dispatcher
  ────────────────────────────────────────────────────────── */
  function renderSidebar() {
    if (comparisonMode) {
      showComparisonPanel();
      hideDetailCard();
    } else if (selectedA3) {
      updateDetailCard(selectedA3);
      hideComparisonPanel();
    } else {
      showDefaultCard();
      hideComparisonPanel();
    }
  }

  /* ──────────────────────────────────────────────────────────
     Detail card
  ────────────────────────────────────────────────────────── */
  function updateDetailCard(a3) {
    const ind   = currentIndicator;
    const name  = COUNTRY_NAMES[a3] || a3;
    const data  = dataCache[ind.id] || {};
    const val   = data[a3];
    const rank  = rankCache[ind.id] && rankCache[ind.id][a3];
    const stats = statCache[ind.id] || {};
    const region = getLocalizedCountryRegion(a3);

    // Share / ratio
    let sharePct = null;
    if (hasFiniteValue(val)) {
      if (ind.shareBase === 'world_total' && stats.total) {
        sharePct = Math.max(0, (val / stats.total) * 100);
      } else if (ind.shareBase === 'world_avg' && stats.avg) {
        sharePct = (val / stats.avg) * 100;
      }
    }
    const sharePctText = sharePct === null
      ? null
      : fmtNumber(sharePct, {
        minimumFractionDigits: ind.shareBase === 'world_total' ? 2 : 1,
        maximumFractionDigits: ind.shareBase === 'world_total' ? 2 : 1,
      });
    const shareWidth = sharePct !== null
      ? Math.min(sharePct * (ind.shareBase === 'world_total' ? 8 : 1), 100)
      : 0;

    // YoY change from history
    const yoy = computeYoY(a3, ind.id);

    const isBookmarked = bookmarks.has(a3);
    const rankLabel = ind.topOrder === 'asc'
      ? t('detail.rankLowest', {}, 'lowest')
      : t('detail.rankHighest', {}, 'highest');
    const safeCountryCode = escapeHtml(a3);
    const safeCountryName = escapeHtml(name);
    const safeRankLabel = escapeHtml(rankLabel);
    const safeMetricLabel = escapeHtml(indicatorPlainLabel(ind));
    const safeRegion = region ? escapeHtml(region) : '';
    const rankBadge = rank
      ? `<span class="rank-badge">#${rank} ${safeRankLabel}</span>`
      : '';

    let shareLabel = '';
    if (sharePctText !== null) {
      shareLabel = ind.shareBase === 'world_total'
        ? t('detail.shareWorldTotal', { share: sharePctText }, `${sharePctText}% of world total`)
        : t('detail.shareWorldAvg', { share: sharePctText }, `${sharePctText}% of world avg`);
    }

    const safeBookmarkTitle = escapeHtml(isBookmarked
      ? t('detail.bookmarkRemoveTitle', {}, 'Remove bookmark')
      : t('detail.bookmarkAddTitle', {}, 'Bookmark this country'));
    const safeMetricValue = escapeHtml(fmtVal(ind, val));
    const safeShareLabel = escapeHtml(shareLabel);
    const safeDataSource = escapeHtml(t('detail.dataSource', {
      source: indicatorSource(ind),
      asOf: indicatorAsOf(ind),
    }, `Source: ${indicatorSource(ind)} · ${indicatorAsOf(ind)}`));
    const safeNoDataMessage = escapeHtml(t('detail.noData', {
      indicator: indicatorPlainLabel(ind),
    }, `No ${indicatorPlainLabel(ind)} data available`));
    const safeDeselectText = escapeHtml(t('detail.deselect', {}, '✕ Deselect'));
    const yoyClass = yoy && ['up', 'down', 'neutral'].includes(yoy.cls) ? yoy.cls : 'neutral';
    const safeYoyText = yoy ? escapeHtml(yoy.text) : '';

    const valueBlock = hasFiniteValue(val)
      ? `<div class="metric-value">${safeMetricValue}</div>
         ${sharePctText !== null ? `
         <div class="share-block">
           <div class="share-bar-bg">
             <div class="share-bar-fill" style="width:${shareWidth}%"></div>
           </div>
           <span class="share-label">${safeShareLabel}</span>
         </div>` : ''}
         ${yoy ? `<div class="yoy-change ${yoyClass}">${safeYoyText}</div>` : ''}
         <div class="data-source">${safeDataSource}</div>`
      : `<div class="no-data-msg">${safeNoDataMessage}</div>`;

    detailCard.innerHTML = `
      <div class="detail-header">
        <div class="detail-header-top">
          <div>
            <div class="country-code">${safeCountryCode}</div>
            <h2 class="country-name">${safeCountryName}</h2>
          </div>
          <button class="bookmark-btn ${isBookmarked ? 'bookmarked' : ''}"
                  title="${safeBookmarkTitle}"
                  id="bookmark-btn-${a3}">
            ${isBookmarked ? '★' : '☆'}
          </button>
        </div>
        ${rankBadge}
        <div class="metric-label">${safeMetricLabel}</div>
        ${region ? `<div class="country-region">${safeRegion}</div>` : ''}
      </div>
      <div class="detail-body">${valueBlock}</div>
      ${buildSparklineHTML(a3, ind.id)}
      ${buildSimilarHTML(a3)}
      <button class="deselect-btn" id="deselect-btn">${safeDeselectText}</button>
    `;

    document.getElementById(`bookmark-btn-${a3}`).addEventListener('click', () => toggleBookmark(a3));
    document.getElementById('deselect-btn').addEventListener('click', clearSelection);

    // Render sparkline SVG
    renderSparkline(a3, ind.id);
    bindSimilarChips(a3);
  }

  function hideDetailCard() {
    detailCard.innerHTML = '';
  }

  function showDefaultCard() {
    const ind = currentIndicator;
    const stats = statCache[ind.id] || {};
    const outliers = stats.sortedEntries ? detectOutliers(ind.id) : null;

    let outlierHTML = '';
    if (outliers && (outliers.high.length + outliers.low.length > 0)) {
      const highItems = outliers.high.slice(0,2).map(([a3,v]) =>
        `<button class="outlier-item" type="button" data-a3="${a3}">
           <strong>${escapeHtml(COUNTRY_NAMES[a3] || a3)}</strong>
           <span class="ov-val">${escapeHtml(fmtVal(ind, v))}</span>
         </button>`).join('');
      const lowItems = outliers.low.slice(0,2).map(([a3,v]) =>
        `<button class="outlier-item low" type="button" data-a3="${a3}">
           <strong>${escapeHtml(COUNTRY_NAMES[a3] || a3)}</strong>
           <span class="ov-val">${escapeHtml(fmtVal(ind, v))}</span>
         </button>`).join('');
      outlierHTML = `
        <div class="outlier-card">
          <h4>${escapeHtml(t('detail.outliersTitle', {}, 'Notable outliers'))}</h4>
          ${highItems}${lowItems}
        </div>`;
    }

    const label = indicatorPlainLabel(ind);
    const icon = (indicatorLabel(ind).match(/\p{Emoji_Presentation}/gu) || [])[0] || '🌍';
    detailCard.innerHTML = `
      <div class="hint-card">
        <div class="hint-icon">${escapeHtml(icon)}</div>
        <p>${escapeHtml(t('detail.defaultHint', { indicator: label }, `Click any country to compare its ${label}.`))}</p>
        <p class="hint-sub">${escapeHtml(t('detail.defaultHintSub', {}, 'Click more countries to compare up to 5'))}</p>
      </div>
      ${outlierHTML}
    `;

    detailCard.querySelectorAll('.outlier-item[data-a3]').forEach(el => {
      el.addEventListener('click', () => focusCountry(el.dataset.a3));
    });
  }

  /* ──────────────────────────────────────────────────────────
     Comparison panel
  ────────────────────────────────────────────────────────── */
  function showComparisonPanel() {
    const ind = currentIndicator;
    compPanel.classList.add('visible');

    const rows = comparisonA3s.map((a3, i) => {
      const data = dataCache[ind.id] || {};
      const val  = data[a3];
      const rank = rankCache[ind.id] && rankCache[ind.id][a3];
      const color = CMP_COLORS[i];
      return `
        <div class="cmp-row" data-a3="${a3}">
          <div class="cmp-color-dot" style="background:${color}"></div>
          <div class="cmp-name">${escapeHtml(COUNTRY_NAMES[a3] || a3)}</div>
          <div class="cmp-rank">${rank ? '#'+rank : '—'}</div>
          <div class="cmp-val">${hasFiniteValue(val) ? escapeHtml(fmtVal(ind, val)) : '—'}</div>
          <button class="cmp-remove" data-a3="${a3}" title="${escapeHtml(t('comparison.removeTitle', {}, 'Remove'))}">✕</button>
        </div>`;
    }).join('');

    compPanel.innerHTML = `
      <h4>${escapeHtml(t('comparison.heading', { count: comparisonA3s.length }, `Comparing ${comparisonA3s.length} countries`))}
        <button id="clear-comparison">${escapeHtml(t('comparison.clearAll', {}, 'Clear all'))}</button>
      </h4>
      ${rows}
      <svg id="cmp-bar-chart" height="0"></svg>
    `;

    compPanel.querySelectorAll('.cmp-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        const a3 = btn.dataset.a3;
        comparisonA3s = comparisonA3s.filter(x => x !== a3);
        comparisonMode = comparisonA3s.length >= 2;
        selectedA3 = comparisonA3s.length === 1 ? comparisonA3s[0] : null;
        applyMapColors();
        renderSidebar();
      });
    });

    document.getElementById('clear-comparison').addEventListener('click', clearSelection);

    renderComparisonBars();
  }

  function hideComparisonPanel() {
    compPanel.classList.remove('visible');
  }

  function renderComparisonBars() {
    const ind  = currentIndicator;
    const data = dataCache[ind.id] || {};
    const entries = comparisonA3s
      .map((a3,i) => ({ a3, val: data[a3], color: CMP_COLORS[i] }))
      .filter(e => hasFiniteValue(e.val));

    if (!entries.length) return;

    const svg  = d3.select('#cmp-bar-chart');
    const W    = parseInt(svg.style('width') || compPanel.clientWidth);
    const barH = 18;
    const pad  = { left: 70, right: 40, top: 4, bottom: 4 };
    const H    = entries.length * (barH + 4) + pad.top + pad.bottom;
    svg.attr('height', H);

    svg.selectAll('*').remove();
    const maxVal = d3.max(entries, d => Math.abs(d.val));
    const xScale = d3.scaleLinear()
      .domain([0, maxVal])
      .range([0, W - pad.left - pad.right]);

    const g = svg.append('g').attr('transform', `translate(${pad.left},${pad.top})`);

    entries.forEach((e, i) => {
      const y = i * (barH + 4);
      g.append('text')
        .attr('x', -4).attr('y', y + barH / 2 + 4)
        .attr('text-anchor', 'end')
        .attr('fill', '#94a3b8').attr('font-size', 10)
        .text((COUNTRY_NAMES[e.a3] || e.a3).slice(0, 10));

      g.append('rect')
        .attr('x', 0).attr('y', y)
        .attr('width', xScale(Math.abs(e.val)))
        .attr('height', barH)
        .attr('rx', 3)
        .attr('fill', e.color)
        .attr('opacity', 0.85)
        .style('cursor', 'pointer')
        .on('click', () => { selectedA3 = e.a3; renderSidebar(); });

      g.append('text')
        .attr('x', xScale(Math.abs(e.val)) + 4)
        .attr('y', y + barH / 2 + 4)
        .attr('fill', '#e2e8f0').attr('font-size', 9)
        .text(fmtVal(ind, e.val));
    });
  }

  /* ──────────────────────────────────────────────────────────
     Sparkline (inline mini chart)
  ────────────────────────────────────────────────────────── */
  function buildSparklineHTML(a3, indId) {
    const hist = getHistoryData(a3, indId);
    if (!hist || hist.length < 3) return '';
    const countryName = COUNTRY_NAMES[a3] || a3;
    const sparkAria = escapeHtml(t('detail.sparkAria', { country: countryName }, `Historical trend for ${countryName}`));
    return `
      <div class="sparkline-container">
        <h4>${t('detail.sparkTitle', {}, '10-Year Trend')}
          <span class="expand-link" id="expand-history">${t('detail.expand', {}, 'Expand ↗')}</span>
        </h4>
        <svg id="sparkline-svg" role="img" aria-label="${sparkAria}">
          <defs>
            <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.3"/>
              <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
            </linearGradient>
          </defs>
        </svg>
      </div>`;
  }

  function renderSparkline(a3, indId) {
    const svgEl = document.getElementById('sparkline-svg');
    if (!svgEl) return;

    const hist = getHistoryData(a3, indId);
    if (!hist || hist.length < 3) return;

    const W = svgEl.clientWidth || 280;
    const H = 48;
    const pad = { left: 4, right: 4, top: 4, bottom: 4 };

    const x = d3.scaleLinear()
      .domain([hist[0].year, hist[hist.length-1].year])
      .range([pad.left, W - pad.right]);
    const y = d3.scaleLinear()
      .domain([d3.min(hist,d=>d.val) * 0.9, d3.max(hist,d=>d.val) * 1.1])
      .range([H - pad.bottom, pad.top]);

    const line = d3.line().x(d => x(d.year)).y(d => y(d.val)).curve(d3.curveMonotoneX);
    const area = d3.area().x(d => x(d.year)).y0(H-pad.bottom).y1(d => y(d.val)).curve(d3.curveMonotoneX);

    const svg = d3.select(svgEl);
    svg.selectAll('*:not(defs)').remove();

    svg.append('path').datum(hist).attr('class','spark-area').attr('d', area);
    svg.append('path').datum(hist).attr('class','spark-line').attr('d', line);

    // Current year dot
    const last = hist[hist.length - 1];
    svg.append('circle').attr('class','spark-dot')
      .attr('cx', x(last.year)).attr('cy', y(last.val)).attr('r', 3);

    // Expand click
    const expandEl = document.getElementById('expand-history');
    if (expandEl) {
      expandEl.addEventListener('click', (e) => {
        e.stopPropagation();
        openHistoryModal(a3, indId);
      });
    }
    svgEl.addEventListener('click', () => openHistoryModal(a3, indId));
  }

  function getHistoryStore(indId) {
    if (indId === 'gdp') return typeof GDP_HISTORY !== 'undefined' ? GDP_HISTORY : null;
    if (indId === 'inflation') return typeof INFLATION_HISTORY !== 'undefined' ? INFLATION_HISTORY : null;
    if (indId === 'unemployment') return typeof UNEMPLOYMENT_HISTORY !== 'undefined' ? UNEMPLOYMENT_HISTORY : null;
    return null;
  }

  function getHistoryData(a3, indId) {
    const histObj = getHistoryStore(indId);
    if (!histObj || !histObj[a3]) return null;

    const years = Object.keys(histObj[a3])
      .map(y => parseInt(y, 10))
      .filter(Number.isFinite)
      .sort((a, b) => a - b);

    return years
      .filter(y => hasFiniteValue(histObj[a3][y]))
      .map(y => ({ year: y, val: histObj[a3][y] }));
  }

  function getRegionHistorySeries(indId, regionName, years) {
    const histObj = getHistoryStore(indId);
    const members = regionName && REGIONS && REGIONS[regionName] ? REGIONS[regionName] : null;
    if (!histObj || !members || !members.length || !Array.isArray(years)) return [];

    return years.map(year => {
      const vals = members
        .map(a3 => histObj[a3] ? histObj[a3][year] : null)
        .filter(v => hasFiniteValue(v));
      if (!vals.length) return null;
      return {
        year,
        val: vals.reduce((sum, v) => sum + v, 0) / vals.length,
      };
    }).filter(Boolean);
  }

  /* ──────────────────────────────────────────────────────────
     History modal
  ────────────────────────────────────────────────────────── */
  function setupHistoryModal() {
    if (historyCloseBtn) {
      historyCloseBtn.addEventListener('click', closeHistoryModal);
    }
    histModal.addEventListener('click', e => {
      if (e.target === histModal) closeHistoryModal();
    });

    // Zoom buttons
    document.querySelectorAll('.zoom-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        if (histModal._currentA3) {
          const years = parseInt(this.dataset.years || '10');
          renderHistoryChart(histModal._currentA3, histModal._currentIndId, years);
        }
      });
    });

    // Reference line toggles
    document.getElementById('toggle-world-ref').addEventListener('change', function () {
      showWorldRef = this.checked;
      if (histModal._currentA3) renderHistoryChart(histModal._currentA3, histModal._currentIndId);
    });
    document.getElementById('toggle-region-ref').addEventListener('change', function () {
      showRegionRef = this.checked;
      if (histModal._currentA3) renderHistoryChart(histModal._currentA3, histModal._currentIndId);
    });
  }

  function openHistoryModal(a3, indId) {
    histModal._currentA3    = a3;
    histModal._currentIndId = indId;

    updateHistoryModalHeader(a3, indId);

    document.querySelectorAll('.zoom-btn').forEach(b => b.classList.remove('active'));
    document.querySelector('.zoom-btn[data-years="10"]').classList.add('active');

    openModal(histModal, historyCloseBtn);
    renderHistoryChart(a3, indId, 10);
  }

  function closeHistoryModal() {
    closeModal(histModal);
  }

  function updateHistoryModalHeader(a3, indId) {
    const ind = getIndicator(indId);
    const name = COUNTRY_NAMES[a3] || a3;
    document.getElementById('history-modal-title').textContent = name;
    document.getElementById('history-modal-subtitle').textContent = t('history.subtitle', {
      indicator: indicatorPlainLabel(ind),
      asOf: indicatorAsOf(ind),
    }, `${indicatorPlainLabel(ind)} · ${indicatorAsOf(ind)}`);
  }

  function renderHistoryChart(a3, indId, yearsBack) {
    yearsBack = yearsBack || 10;
    const hist = getHistoryData(a3, indId);
    const svgEl = document.getElementById('history-chart-svg');
    if (!svgEl) return;

    const filtered = hist ? hist.slice(-yearsBack) : [];

    const W  = svgEl.clientWidth || 620;
    const H  = svgEl.clientHeight || 260;
    const pad = { left: 50, right: 20, top: 20, bottom: 36 };

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    // Defs
    svg.append('defs').append('linearGradient')
      .attr('id','histGrad').attr('x1','0%').attr('y1','0%').attr('x2','0%').attr('y2','100%')
      .call(g => {
        g.append('stop').attr('offset','0%').attr('stop-color','#38bdf8').attr('stop-opacity',.2);
        g.append('stop').attr('offset','100%').attr('stop-color','#38bdf8').attr('stop-opacity',0);
      });

    if (!filtered.length) {
      svg.append('text').attr('x', W/2).attr('y', H/2)
        .attr('text-anchor','middle').attr('fill','#64748b').attr('font-size',13)
        .text(t('history.noData', {}, 'No historical data available for this indicator'));
      return;
    }

    const ind = getIndicator(indId);
    const stats = statCache[indId] || {};
    const regionName = getCountryRegion(a3);
    const regionSeries = showRegionRef && regionName
      ? getRegionHistorySeries(indId, regionName, filtered.map(d => d.year))
      : [];

    const allVals = [...filtered.map(d=>d.val)];
    if (showWorldRef && stats.avg) allVals.push(stats.avg);
    if (regionSeries.length) allVals.push(...regionSeries.map(d => d.val));

    const x = d3.scaleLinear()
      .domain([filtered[0].year, filtered[filtered.length-1].year])
      .range([pad.left, W - pad.right]);
    const y = d3.scaleLinear()
      .domain([d3.min(allVals)*0.85, d3.max(allVals)*1.15])
      .range([H - pad.bottom, pad.top]);

    // Axes
    svg.append('g').attr('class','axis')
      .attr('transform',`translate(0,${H-pad.bottom})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('d')).ticks(yearsBack));
    svg.append('g').attr('class','axis')
      .attr('transform',`translate(${pad.left},0)`)
      .call(d3.axisLeft(y).ticks(5).tickFormat(v => fmtVal(ind, v)));

    const area = d3.area().x(d=>x(d.year)).y0(H-pad.bottom).y1(d=>y(d.val)).curve(d3.curveMonotoneX);
    const line = d3.line().x(d=>x(d.year)).y(d=>y(d.val)).curve(d3.curveMonotoneX);

    svg.append('path').datum(filtered).attr('class','history-area').attr('d', area);
    svg.append('path').datum(filtered).attr('class','history-line').attr('d', line);

    // Reference lines
    if (showWorldRef && stats.avg) {
      svg.append('line').attr('class','ref-world')
        .attr('x1',pad.left).attr('x2',W-pad.right)
        .attr('y1',y(stats.avg)).attr('y2',y(stats.avg));
      svg.append('text').attr('class','ref-label')
        .attr('x',W-pad.right+2).attr('y',y(stats.avg)+4)
        .text(t('history.worldAvgLabel', {}, 'World avg'));
    }

    if (regionSeries.length >= 2) {
      const regionLine = d3.line().x(d => x(d.year)).y(d => y(d.val)).curve(d3.curveMonotoneX);
      svg.append('path').datum(regionSeries).attr('class', 'ref-region').attr('d', regionLine);

      const lastPoint = regionSeries[regionSeries.length - 1];
      svg.append('text').attr('class', 'ref-label')
        .attr('x', x(lastPoint.year) + 6)
        .attr('y', y(lastPoint.val) - 6)
        .text(t('history.regionAvgLabel', { region: regionLabel(regionName) }, `${regionLabel(regionName)} avg`));
    }

    // Dots with tooltip
    const ttGroup = svg.append('g');
    filtered.forEach(d => {
      ttGroup.append('circle').attr('class','history-dot')
        .attr('cx', x(d.year)).attr('cy', y(d.val)).attr('r', 4)
        .attr('fill','#38bdf8')
        .on('mouseover', function (e) {
          tooltipEl.style.display = 'block';
          tooltipEl.style.left = (e.clientX + 12) + 'px';
          tooltipEl.style.top  = (e.clientY - 30) + 'px';
          tooltipEl.innerHTML  = `<strong>${escapeHtml(d.year)}</strong><br>${escapeHtml(fmtVal(ind, d.val))}`;
        })
        .on('mouseleave', onMouseLeave);
    });
  }

  /* ──────────────────────────────────────────────────────────
     Similar countries
  ────────────────────────────────────────────────────────── */
  function buildSimilarHTML(a3) {
    const similar = computeSimilar(a3);
    if (!similar.length) return '';
    const chips = similar.map(s =>
      `<button class="similar-chip" type="button" data-a3="${s.a3}" title="${escapeHtml(s.dims)}">
        ${escapeHtml(COUNTRY_NAMES[s.a3] || s.a3)}
        <span class="sim-pct">${escapeHtml(s.pct)}%</span>
      </button>`).join('');
    return `<div class="similar-section"><h4>${escapeHtml(t('detail.similarTitle', {}, 'Similar economies'))}</h4><div class="similar-chips">${chips}</div></div>`;
  }

  function bindSimilarChips(a3) {
    detailCard.querySelectorAll('.similar-chip[data-a3]').forEach(el => {
      el.addEventListener('click', () => focusCountry(el.dataset.a3));
    });
  }

  function computeSimilar(targetA3) {
    const indicators = INDICATORS.filter(i => i.higherIsBetter !== null);
    // Build normalised vectors
    const ranges = {};
    indicators.forEach(ind => {
      const vals = Object.values(dataCache[ind.id] || {}).filter(Number.isFinite);
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      ranges[ind.id] = { min, max: max - min || 1 };
    });

    function normVector(a3) {
      return indicators.map(ind => {
        const v = (dataCache[ind.id] || {})[a3];
        if (v === undefined || !Number.isFinite(v)) return null;
        return (v - ranges[ind.id].min) / ranges[ind.id].max;
      });
    }

    const targetVec = normVector(targetA3);
    const validDims = targetVec.map((v,i) => v !== null ? i : -1).filter(i => i >= 0);
    if (validDims.length < 2) return [];

    const candidates = Object.keys(COUNTRY_NAMES)
      .filter(a3 => a3 !== targetA3)
      .map(a3 => {
        const vec = normVector(a3);
        const sharedDims = validDims.filter(i => vec[i] !== null);
        if (sharedDims.length < 2) return null;
        const dist = Math.sqrt(sharedDims.reduce((s,i) => s + (targetVec[i]-vec[i])**2, 0) / sharedDims.length);
        const pct = Math.round((1 - Math.min(dist, 1)) * 100);
        const dims = sharedDims.slice(0,3).map(i => indicatorPlainLabel(indicators[i])).join(', ');
        return { a3, pct, dims };
      })
      .filter(Boolean)
      .sort((a,b) => b.pct - a.pct)
      .slice(0, 5);

    return candidates;
  }

  /* ──────────────────────────────────────────────────────────
     Year-over-year helper
  ────────────────────────────────────────────────────────── */
  function computeYoY(a3, indId) {
    const hist = getHistoryData(a3, indId);
    if (!hist || hist.length < 2) return null;
    const cur  = hist[hist.length - 1].val;
    const prev = hist[hist.length - 2].val;
    if (!hasFiniteValue(prev) || prev === 0) return null;
    const diff = cur - prev;
    const pctRaw = Math.abs((diff / Math.abs(prev)) * 100);
    const pct = fmtNumber(pctRaw, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const ind  = getIndicator(indId);
    const up   = diff > 0;
    const improving = ind.higherIsBetter === null ? null : (ind.higherIsBetter ? up : !up);
    const cls  = improving === null ? 'neutral' : (improving ? 'up' : 'down');
    const arrow = diff > 0 ? '▲' : '▼';
    return {
      cls,
      text: t('detail.yoyText', { arrow, pct }, `${arrow} ${pct}% vs prev year`),
    };
  }

  /* ──────────────────────────────────────────────────────────
     Outlier detection
  ────────────────────────────────────────────────────────── */
  function detectOutliers(indId) {
    const stats = statCache[indId];
    if (!stats || !stats.stdDev) return null;
    const { avg, stdDev, sortedEntries } = stats;
    const threshold = 2;
    const high = sortedEntries.filter(([,v]) => v > avg + threshold * stdDev).slice(0,3);
    const low  = sortedEntries.filter(([,v]) => v < avg - threshold * stdDev).reverse().slice(0,3);
    return { high, low };
  }

  /* ──────────────────────────────────────────────────────────
     Legend
  ────────────────────────────────────────────────────────── */
  function buildLegend() {
    const ind = currentIndicator;
    const plainLabel = indicatorPlainLabel(ind);
    let betterText = '', worseText = '';

    if (ind.higherIsBetter === true) {
      betterText = t('legend.betterHigher', { indicator: plainLabel }, `Higher ${plainLabel} than selected`);
      worseText  = t('legend.worseHigher', { indicator: plainLabel }, `Lower ${plainLabel} than selected`);
    } else if (ind.higherIsBetter === false) {
      betterText = t('legend.betterLower', { indicator: plainLabel }, `Lower ${plainLabel} than selected`);
      worseText  = t('legend.worseLower', { indicator: plainLabel }, `Higher ${plainLabel} than selected`);
    } else {
      betterText = t('legend.higherValue', {}, 'Higher value');
      worseText  = t('legend.lowerValue', {}, 'Lower value');
    }

    const safeLegendTitle = escapeHtml(t('legend.title', {}, 'Map Key'));
    const safeThresholdButton = escapeHtml(t('legend.thresholdButton', {}, 'Thresholds'));
    const safeSelectedCountry = escapeHtml(t('legend.selectedCountry', {}, 'Selected country'));
    const safeBetterText = escapeHtml(betterText);
    const safeWorseText = escapeHtml(worseText);
    const safeNoDataText = escapeHtml(t('legend.noData', {}, 'No data / unselected'));
    const safeThresholdsTitle = escapeHtml(t('legend.thresholdsTitle', {}, 'Comparison thresholds'));
    const safeRelativeText = escapeHtml(t('legend.relative', {}, 'Relative (%)'));
    const safeAbsoluteText = escapeHtml(t('legend.absolute', {}, 'Absolute'));
    const safeThresholdText = escapeHtml(t('legend.threshold', {}, 'Threshold:'));
    const safeResetText = escapeHtml(t('legend.resetDefaults', {}, 'Reset to defaults'));
    const safeThresholdUnit = thresholdMode === 'relative' ? '%' : escapeHtml(indicatorUnit(ind));

    legendEl.innerHTML = `
      <h4>${safeLegendTitle} <button class="threshold-btn" id="threshold-btn">${safeThresholdButton}</button></h4>
      <div class="legend-row"><span class="legend-swatch" style="background:#3b82f6"></span> ${safeSelectedCountry}</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#22c55e"></span> ${safeBetterText}</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#ef4444"></span> ${safeWorseText}</div>
      <div class="legend-row"><span class="legend-swatch" style="background:#374151"></span> ${safeNoDataText}</div>
      <div class="threshold-popover" id="threshold-popover">
        <h5>${safeThresholdsTitle}</h5>
        <div class="threshold-mode-toggle">
          <button id="thresh-relative" class="${thresholdMode === 'relative' ? 'active' : ''}">${safeRelativeText}</button>
          <button id="thresh-absolute" class="${thresholdMode === 'absolute' ? 'active' : ''}">${safeAbsoluteText}</button>
        </div>
        <div class="threshold-row">
          <span>${safeThresholdText}</span>
          <input type="number" id="threshold-val" value="${thresholdValue}" min="0" step="1">
          <span>${safeThresholdUnit}</span>
        </div>
        <div class="threshold-footer">
          <button id="threshold-reset">${safeResetText}</button>
        </div>
      </div>
    `;

    document.getElementById('threshold-btn').addEventListener('click', e => {
      e.stopPropagation();
      document.getElementById('threshold-popover').classList.toggle('visible');
    });
    document.getElementById('thresh-relative').addEventListener('click', () => setThreshMode('relative'));
    document.getElementById('thresh-absolute').addEventListener('click', () => setThreshMode('absolute'));
    document.getElementById('threshold-val').addEventListener('input', function () {
      thresholdValue = parseFloat(this.value) || 20;
      saveThresholds();
      applyMapColors();
    });
    document.getElementById('threshold-reset').addEventListener('click', () => {
      thresholdMode = 'relative'; thresholdValue = 20;
      buildLegend();
      applyMapColors();
    });
    if (legendOutsideClickHandler) {
      document.removeEventListener('click', legendOutsideClickHandler, true);
    }
    legendOutsideClickHandler = e => {
      const pop = document.getElementById('threshold-popover');
      if (pop && !pop.contains(e.target) && e.target.id !== 'threshold-btn') {
        pop.classList.remove('visible');
      }
    };
    document.addEventListener('click', legendOutsideClickHandler, true);
  }

  function setThreshMode(mode) {
    thresholdMode = mode;
    document.getElementById('thresh-relative').classList.toggle('active', mode === 'relative');
    document.getElementById('thresh-absolute').classList.toggle('active', mode === 'absolute');
    saveThresholds();
    applyMapColors();
  }

  function saveThresholds() {
    const ok = writeStorageJSON(`${STORAGE_KEYS.thresholdPrefix}${currentIndicator.id}`, {
      mode: thresholdMode,
      val: thresholdValue,
    });
    if (!ok) {
      showToast(t('errors.storageWrite', {}, 'Could not save changes in this browser session.'), 'warn');
    }
  }

  function loadThresholds() {
    const saved = readStorageJSON(`${STORAGE_KEYS.thresholdPrefix}${currentIndicator.id}`, null);
    if (!saved) return;
    if (saved.mode === 'relative' || saved.mode === 'absolute') {
      thresholdMode = saved.mode;
    }
    if (Number.isFinite(saved.val)) {
      thresholdValue = saved.val;
    }
  }

  /* ──────────────────────────────────────────────────────────
     Top list
  ────────────────────────────────────────────────────────── */
  function buildTopList() {
    const ind    = currentIndicator;
    const stats  = statCache[ind.id] || {};
    const sorted = stats.sortedEntries || [];

    // Apply group filter
    let candidates = sorted;
    if (activeGroupFilter && REGIONS[activeGroupFilter]) {
      candidates = sorted.filter(([a3]) => REGIONS[activeGroupFilter].includes(a3));
    }

    // Apply value filter
    if (filterMin !== null || filterMax !== null) {
      candidates = candidates.filter(([,v]) => passesCurrentValueFilter(v));
    }

    const top = candidates.slice(0, 10);

    const list = document.getElementById('top-list');
    list.innerHTML = '';

    top.forEach(([a3, val]) => {
      const countryName = COUNTRY_NAMES[a3] || a3;
      const formattedVal = fmtVal(ind, val);
      const li = document.createElement('li');

      const btn = document.createElement('button');
      btn.className = 'top-item-btn';
      btn.type = 'button';
      btn.setAttribute('aria-label', `${countryName}, ${formattedVal}`);

      const nameEl = document.createElement('span');
      nameEl.className = 'top-name';
      nameEl.textContent = countryName;

      const valEl = document.createElement('span');
      valEl.className = 'top-val';
      valEl.textContent = formattedVal;

      btn.appendChild(nameEl);
      btn.appendChild(valEl);
      li.appendChild(btn);
      li.addEventListener('click', () => focusCountry(a3));
      list.appendChild(li);
    });

    // Update section title
    const topLabel = indicatorTopLabel(ind);
    document.querySelector('#top-economies h3').textContent = topLabel;
    document.querySelector('#top-list').setAttribute('aria-label', topLabel);
  }

  /* ──────────────────────────────────────────────────────────
     Focus country (from list or search)
  ────────────────────────────────────────────────────────── */
  function focusCountry(a3) {
    // Zoom map to country
    const feat = worldFeatures && worldFeatures.find(d => resolveCountryA3(d.id) === a3);
    if (feat && pathFn) {
      const [[x0,y0],[x1,y1]] = pathFn.bounds(feat);
      const W  = mapContainer.clientWidth;
      const H  = mapContainer.clientHeight;
      const dx = x1 - x0;
      const dy = y1 - y0;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const scale = Math.min(8, 0.7 / Math.max(dx / W, dy / H));
      const tx = W / 2 - scale * cx;
      const ty = H / 2 - scale * cy;
      d3.select('#world-map')
        .transition().duration(600)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }

    if (comparisonA3s.length >= 1 && !comparisonA3s.includes(a3)) {
      if (comparisonA3s.length >= MAX_COMPARISON) comparisonA3s.shift();
      comparisonA3s.push(a3);
      comparisonMode = comparisonA3s.length >= 2;
    } else if (!comparisonA3s.includes(a3)) {
      comparisonA3s = [a3];
      comparisonMode = false;
    }
    selectedA3 = comparisonMode ? null : a3;

    const focusedCountryPath = svgG ? svgG.select(`path.country[data-a3="${a3}"]`).node() : null;
    if (focusedCountryPath) {
      setMapTabStop(focusedCountryPath);
    }

    applyMapColors();
    renderSidebar();
    // Preserve whichever mobile panel the user is currently on.
    pushURLState();
  }

  /* ──────────────────────────────────────────────────────────
     Indicator tabs
  ────────────────────────────────────────────────────────── */
  function buildIndicatorTabs() {
    const container = document.querySelector('.indicator-tabs');
    if (!container) return;
    container.innerHTML = '';

    const groups = [...new Set(INDICATORS.map(i => i.group))];
    groups.forEach((group, gi) => {
      if (gi > 0) {
        const div = document.createElement('div');
        div.className = 'tab-divider';
        div.setAttribute('role', 'presentation');
        div.setAttribute('aria-hidden', 'true');
        container.appendChild(div);
      }
      const lbl = document.createElement('span');
      lbl.className = 'tab-group-label';
      lbl.textContent = indicatorGroupLabel(group);
      lbl.setAttribute('role', 'presentation');
      lbl.setAttribute('aria-hidden', 'true');
      container.appendChild(lbl);

      INDICATORS.filter(i => i.group === group).forEach(ind => {
        const active = ind.id === currentIndicator.id;
        const btn = document.createElement('button');
        btn.className = 'mode-btn' + (active ? ' active' : '');
        btn.dataset.mode = ind.id;
        btn.textContent = indicatorLabel(ind);
        btn.title = `${indicatorPlainLabel(ind)} · ${indicatorSource(ind)} · ${indicatorAsOf(ind)}`;
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
        btn.setAttribute('tabindex', active ? '0' : '-1');
        btn.addEventListener('click', () => switchIndicator(ind.id));
        container.appendChild(btn);
      });
    });

    if (container.dataset.tablistBound !== '1') {
      container.addEventListener('keydown', e => {
        const current = e.target;
        if (!(current instanceof HTMLElement) || !current.classList.contains('mode-btn')) return;

        const tabs = [...container.querySelectorAll('.mode-btn')];
        const idx = tabs.indexOf(current);
        if (idx < 0) return;

        let nextIdx = idx;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') nextIdx = (idx + 1) % tabs.length;
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') nextIdx = (idx - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') nextIdx = 0;
        else if (e.key === 'End') nextIdx = tabs.length - 1;
        else return;

        e.preventDefault();
        const next = tabs[nextIdx];
        if (!next) return;
        next.focus();
        next.click();
      });
      container.dataset.tablistBound = '1';
    }
  }

  function switchIndicator(id) {
    if (currentIndicator.id === id) return;
    currentIndicator = getIndicator(id);
    loadThresholds();

    document.querySelectorAll('.mode-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === id);
      b.setAttribute('aria-selected', b.dataset.mode === id ? 'true' : 'false');
      b.setAttribute('tabindex', b.dataset.mode === id ? '0' : '-1');
    });

    // Keep selections, update colours + data
    applyMapColors();
    buildLegend();
    buildTopList();
    updateStatusBar();
    updateAriaLabels();

    if (comparisonMode) showComparisonPanel();
    else if (selectedA3) updateDetailCard(selectedA3);
    else showDefaultCard();

    pushURLState();
    EventBus.emit('modeChanged', { id });
  }

  /* ──────────────────────────────────────────────────────────
     Search
  ────────────────────────────────────────────────────────── */
  function setupSearch() {
    let highlighted = -1;

    function clearSearchActiveDescendant() {
      searchInput.removeAttribute('aria-activedescendant');
      searchResults.querySelectorAll('.search-result-item').forEach(el => {
        el.classList.remove('highlighted');
        el.setAttribute('aria-selected', 'false');
      });
      highlighted = -1;
    }

    function updateSearchHighlight(items) {
      items.forEach((el, i) => {
        const active = i === highlighted;
        el.classList.toggle('highlighted', active);
        el.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      if (highlighted >= 0 && items[highlighted]) {
        searchInput.setAttribute('aria-activedescendant', items[highlighted].id);
      } else {
        searchInput.removeAttribute('aria-activedescendant');
      }
    }

    searchInput.addEventListener('input', function () {
      const q = this.value.trim().toLowerCase();
      if (q.length < 1) {
        searchResults.classList.remove('visible');
        clearSearchActiveDescendant();
        return;
      }
      const ind  = currentIndicator;
      const data = dataCache[ind.id] || {};

      const results = Object.keys(COUNTRY_NAMES)
        .filter(a3 => {
          const name = (COUNTRY_NAMES[a3] || '').toLowerCase();
          return name.startsWith(q) || name.includes(q) || a3.toLowerCase().startsWith(q);
        })
        .sort((a, b) => {
          const na = (COUNTRY_NAMES[a] || '').toLowerCase();
          const nb = (COUNTRY_NAMES[b] || '').toLowerCase();
          if (na.startsWith(q) && !nb.startsWith(q)) return -1;
          if (!na.startsWith(q) && nb.startsWith(q)) return 1;
          return na.localeCompare(nb);
        })
        .slice(0, 8);

      if (!results.length) {
        searchResults.innerHTML = `<div class="search-result-item is-empty" role="option" aria-disabled="true">${escapeHtml(t('search.noResults', {}, 'No matching countries'))}</div>`;
        searchResults.classList.add('visible');
        clearSearchActiveDescendant();
        return;
      }

      searchResults.innerHTML = results.map((a3, idx) => {
        const val = data[a3];
        return `<div class="search-result-item" role="option" aria-selected="false" id="search-result-${idx}-${a3}" data-a3="${a3}">
          <span class="sr-name">${escapeHtml(COUNTRY_NAMES[a3] || a3)}</span>
          <span class="sr-val">${hasFiniteValue(val) ? escapeHtml(fmtVal(ind, val)) : '—'}</span>
        </div>`;
      }).join('');

      searchResults.classList.add('visible');
      clearSearchActiveDescendant();

      searchResults.querySelectorAll('.search-result-item[data-a3]').forEach(el => {
        el.addEventListener('click', () => {
          focusCountry(el.dataset.a3);
          searchInput.value = '';
          searchResults.classList.remove('visible');
          clearSearchActiveDescendant();
        });
      });
    });

    // Keyboard navigation in results
    searchInput.addEventListener('keydown', function (e) {
      const items = searchResults.querySelectorAll('.search-result-item[data-a3]');
      if (!items.length) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlighted = Math.min(highlighted + 1, items.length - 1);
        updateSearchHighlight(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlighted = Math.max(highlighted - 1, 0);
        updateSearchHighlight(items);
      } else if (e.key === 'Enter' && highlighted >= 0) {
        e.preventDefault();
        items[highlighted].click();
      } else if (e.key === 'Escape') {
        searchResults.classList.remove('visible');
        searchInput.value = '';
        clearSearchActiveDescendant();
      }
    });

    // Click outside
    document.addEventListener('click', e => {
      if (!e.target.closest('#search-container')) {
        searchResults.classList.remove('visible');
        clearSearchActiveDescendant();
      }
    });
  }

  /* ──────────────────────────────────────────────────────────
     Group / region selector
  ────────────────────────────────────────────────────────── */
  function setupGroupSelector() {
    if (!groupSelector) return;
    populateGroupOptions();

    if (groupSelector.dataset.bound === '1') return;
    groupSelector.addEventListener('change', function () {
      activeGroupFilter = this.value || null;
      applyMapColors();
      buildTopList();
      EventBus.emit('groupFiltered', { groupName: activeGroupFilter });
    });
    groupSelector.dataset.bound = '1';
  }

  function populateGroupOptions() {
    if (!groupSelector) return;

    const currentValue = activeGroupFilter || groupSelector.value || '';
    const optionDefs = [
      { value: '', key: 'groups.allCountries' },
      { value: 'North America', key: 'groups.northAmerica' },
      { value: 'Caribbean', key: 'groups.caribbean' },
      { value: 'South America', key: 'groups.southAmerica' },
      { value: 'Western Europe', key: 'groups.westernEurope' },
      { value: 'Eastern Europe', key: 'groups.easternEurope' },
      { value: 'Middle East', key: 'groups.middleEast' },
      { value: 'Central Asia', key: 'groups.centralAsia' },
      { value: 'South Asia', key: 'groups.southAsia' },
      { value: 'East Asia', key: 'groups.eastAsia' },
      { value: 'Southeast Asia', key: 'groups.southeastAsia' },
      { value: 'Oceania', key: 'groups.oceania' },
      { value: 'North Africa', key: 'groups.northAfrica' },
      { value: 'Sub-Saharan Africa', key: 'groups.subSaharanAfrica' },
      { value: '__separator__', key: 'groups.separator', disabled: true },
      { value: 'G7', key: 'groups.g7' },
      { value: 'G20', key: 'groups.g20' },
      { value: 'EU-27', key: 'groups.eu27' },
      { value: 'BRICS+', key: 'groups.bricsPlus' },
      { value: 'ASEAN', key: 'groups.asean' },
      { value: 'NATO', key: 'groups.nato' },
      { value: 'OPEC+', key: 'groups.opecPlus' },
    ];

    groupSelector.innerHTML = '';
    optionDefs.forEach(def => {
      const opt = document.createElement('option');
      opt.value = def.disabled ? '' : def.value;
      opt.textContent = t(def.key, {}, def.value === '__separator__' ? '— Groups —' : def.value || 'All Countries');
      if (def.disabled) {
        opt.disabled = true;
        opt.dataset.separator = '1';
      }
      groupSelector.appendChild(opt);
    });

    const hasCurrent = [...groupSelector.options].some(opt => !opt.disabled && opt.value === currentValue);
    groupSelector.value = hasCurrent ? currentValue : '';
  }

  /* ──────────────────────────────────────────────────────────
     Currency selector
  ────────────────────────────────────────────────────────── */
  function setupCurrencySelector() {
    const sel = document.getElementById('currency-select');
    if (!sel) return;

    populateCurrencyOptions();

    if (sel.dataset.bound === '1') return;
    sel.addEventListener('change', function () {
      activeCurrency = CURRENCIES.find(c => c.id === this.value) || CURRENCIES[0];
      refreshAllDisplays();
    });
    sel.dataset.bound = '1';
  }

  function populateCurrencyOptions() {
    const sel = document.getElementById('currency-select');
    if (!sel) return;

    const currentId = (activeCurrency && activeCurrency.id) || sel.value || CURRENCIES[0].id;
    sel.innerHTML = '';

    CURRENCIES.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      const currencyName = t(`currencies.${c.id}`, {}, c.name);
      opt.textContent = `${c.symbol} ${c.id} – ${currencyName}`;
      sel.appendChild(opt);
    });

    const hasCurrent = CURRENCIES.some(c => c.id === currentId);
    sel.value = hasCurrent ? currentId : CURRENCIES[0].id;
    activeCurrency = CURRENCIES.find(c => c.id === sel.value) || CURRENCIES[0];
  }

  // Re-render every display surface after a currency change
  function refreshAllDisplays() {
    buildTopList();
    buildLegend();
    updateStatusBar();
    if (comparisonMode) showComparisonPanel();
    else if (selectedA3) updateDetailCard(selectedA3);
    else showDefaultCard();
    renderWatchlist();
    if (document.getElementById('correlation-view').classList.contains('visible')) {
      renderCorrelation();
    }
  }

  /* ──────────────────────────────────────────────────────────
     Filter panel
  ────────────────────────────────────────────────────────── */
  function setupFilterPanel() {
    const toggleFilters = () => {
      const isOpen = filterPanel.classList.toggle('open');
      filterToggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      filterBody.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    };

    filterToggle.addEventListener('click', toggleFilters);
    if (filterToggle.tagName !== 'BUTTON') {
      filterToggle.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleFilters();
        }
      });
    }

    filterMinInput.addEventListener('input', applyValueFilter);
    filterMaxInput.addEventListener('input', applyValueFilter);

    document.getElementById('filter-reset').addEventListener('click', () => {
      filterMin = null; filterMax = null;
      filterMinInput.value = '';
      filterMaxInput.value = '';
      filterChips.innerHTML = '';
      applyMapColors();
      buildTopList();
    });
  }

  function applyValueFilter() {
    const parsedMin = filterMinInput.value !== '' ? parseFloat(filterMinInput.value) : null;
    const parsedMax = filterMaxInput.value !== '' ? parseFloat(filterMaxInput.value) : null;
    filterMin = Number.isFinite(parsedMin) ? parsedMin : null;
    filterMax = Number.isFinite(parsedMax) ? parsedMax : null;

    filterChips.innerHTML = '';
    if (filterMin !== null) {
      addFilterChip(
        t('filter.minChip', { value: fmtNumber(filterMin) }, `Min: ${fmtNumber(filterMin)}`),
        () => { filterMin = null; filterMinInput.value = ''; applyMapColors(); buildTopList(); }
      );
    }
    if (filterMax !== null) {
      addFilterChip(
        t('filter.maxChip', { value: fmtNumber(filterMax) }, `Max: ${fmtNumber(filterMax)}`),
        () => { filterMax = null; filterMaxInput.value = ''; applyMapColors(); buildTopList(); }
      );
    }

    applyMapColors();
    buildTopList();
  }

  function addFilterChip(label, onRemove) {
    const chip = document.createElement('span');
    chip.className = 'filter-chip';
    const text = document.createElement('span');
    text.textContent = label;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '✕';
    btn.addEventListener('click', onRemove);
    chip.appendChild(text);
    chip.appendChild(document.createTextNode(' '));
    chip.appendChild(btn);
    filterChips.appendChild(chip);
  }

  /* ──────────────────────────────────────────────────────────
     Bookmarks
  ────────────────────────────────────────────────────────── */
  function loadBookmarks() {
    const saved = readStorageJSON(STORAGE_KEYS.bookmarks, []);
    bookmarks = Array.isArray(saved) ? new Set(saved) : new Set();
  }

  function saveBookmarksStorage() {
    const ok = writeStorageJSON(STORAGE_KEYS.bookmarks, [...bookmarks]);
    if (!ok) {
      showToast(t('errors.storageWrite', {}, 'Could not save changes in this browser session.'), 'warn');
    }
    return ok;
  }

  function toggleBookmark(a3) {
    if (bookmarks.has(a3)) {
      bookmarks.delete(a3);
    } else {
      if (bookmarks.size >= MAX_BOOKMARKS) {
        showToast(t('bookmarks.maxLimit', { max: MAX_BOOKMARKS }, `Max ${MAX_BOOKMARKS} bookmarks reached. Remove one from your watchlist first.`), 'warn');
        return;
      }
      bookmarks.add(a3);
    }
    saveBookmarksStorage();
    applyMapColors();
    updateDetailCard(a3);
    renderWatchlist();
    EventBus.emit('bookmarksChanged', { bookmarks });
  }

  /* ──────────────────────────────────────────────────────────
     Watchlist
  ────────────────────────────────────────────────────────── */
  function setupWatchlist() {
    const toggle = document.getElementById('watchlist-toggle');
    const section = document.getElementById('watchlist-section');
    const toggleWatchlist = () => {
      const isOpen = section.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    };

    toggle.addEventListener('click', toggleWatchlist);
    if (toggle.tagName !== 'BUTTON') {
      toggle.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleWatchlist();
        }
      });
    }
    renderWatchlist();

    // Re-render on mode change to update values
    EventBus.on('modeChanged', renderWatchlist);
  }

  function renderWatchlist() {
    const ind  = currentIndicator;
    const data = dataCache[ind.id] || {};

    if (!bookmarks.size) {
      pendingWatchlistClearUntil = 0;
      watchlistBody.innerHTML = '';
      const empty = document.createElement('div');
      empty.className = 'watchlist-empty';
      empty.textContent = t('watchlist.empty', {}, 'Click ☆ on any country to bookmark it.');
      watchlistBody.appendChild(empty);
      return;
    }

    const items = [...bookmarks].map(a3 => {
      const val = data[a3];
      return `<div class="watchlist-item">
        <button class="wl-name" type="button" data-a3="${a3}">${escapeHtml(COUNTRY_NAMES[a3] || a3)}</button>
        <span class="wl-val">${hasFiniteValue(val) ? escapeHtml(fmtVal(ind, val)) : '—'}</span>
        <button class="wl-remove" data-a3="${a3}" title="${escapeHtml(t('watchlist.removeTitle', {}, 'Remove bookmark'))}">✕</button>
      </div>`;
    }).join('');

    watchlistBody.innerHTML = items + `<button class="watchlist-clear" id="watchlist-clear-all">${escapeHtml(t('watchlist.clearAll', {}, 'Clear all'))}</button>`;

    watchlistBody.querySelectorAll('.wl-name[data-a3]').forEach(el => {
      el.addEventListener('click', () => focusCountry(el.dataset.a3));
    });
    watchlistBody.querySelectorAll('.wl-remove[data-a3]').forEach(btn => {
      btn.addEventListener('click', () => { bookmarks.delete(btn.dataset.a3); saveBookmarksStorage(); applyMapColors(); renderWatchlist(); });
    });
    document.getElementById('watchlist-clear-all').addEventListener('click', () => {
      const now = Date.now();
      if (pendingWatchlistClearUntil > now) {
        pendingWatchlistClearUntil = 0;
        bookmarks.clear();
        saveBookmarksStorage();
        applyMapColors();
        renderWatchlist();
        showToast(t('watchlist.cleared', {}, 'Watchlist cleared.'));
        return;
      }
      pendingWatchlistClearUntil = now + 2500;
      showToast(t('watchlist.clearConfirm', {}, 'Click Clear all again to confirm.'), 'warn');
    });
  }

  /* ──────────────────────────────────────────────────────────
     Status bar
  ────────────────────────────────────────────────────────── */
  function updateStatusBar() {
    const ind  = currentIndicator;
    const data = dataCache[ind.id] || {};
    const count = Object.keys(data).length;
    statusSource.textContent = t('status.summary', {
      indicator: indicatorPlainLabel(ind),
      source: indicatorSource(ind),
      asOf: indicatorAsOf(ind),
      count: fmtNumber(count),
    }, `${indicatorPlainLabel(ind)} · ${indicatorSource(ind)} · ${indicatorAsOf(ind)} · ${fmtNumber(count)} countries`);

    const offlineEl = document.getElementById('status-offline');
    if (offlineEl) offlineEl.style.display = navigator.onLine ? 'none' : 'inline';
  }

  window.addEventListener('offline', updateStatusBar);
  window.addEventListener('online',  updateStatusBar);

  /* ──────────────────────────────────────────────────────────
     Welcome modal
  ────────────────────────────────────────────────────────── */
  function getModalFocusableElements(modalEl) {
    if (!modalEl) return [];
    return [...modalEl.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
      .filter(el => !el.disabled && el.getClientRects().length > 0);
  }

  function openModal(modalEl, focusTarget) {
    if (!modalEl) return;
    modalEl._lastFocusedEl = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modalEl.classList.add('visible');
    modalEl.setAttribute('aria-hidden', 'false');
    const target = focusTarget || getModalFocusableElements(modalEl)[0] || null;
    if (target && typeof target.focus === 'function') {
      setTimeout(() => target.focus(), 0);
    }
  }

  function closeModal(modalEl, fallbackFocusEl) {
    if (!modalEl) return;
    modalEl.classList.remove('visible');
    modalEl.setAttribute('aria-hidden', 'true');

    const restoreEl = modalEl._lastFocusedEl;
    if (restoreEl && typeof restoreEl.focus === 'function') {
      restoreEl.focus();
    } else if (fallbackFocusEl && typeof fallbackFocusEl.focus === 'function') {
      fallbackFocusEl.focus();
    }
    modalEl._lastFocusedEl = null;
  }

  function getActiveModal() {
    if (welcomeModal && welcomeModal.classList.contains('visible')) return welcomeModal;
    if (shareModal && shareModal.classList.contains('visible')) return shareModal;
    if (histModal && histModal.classList.contains('visible')) return histModal;
    return null;
  }

  function closeActiveModal() {
    if (welcomeModal && welcomeModal.classList.contains('visible')) {
      closeWelcomeModal();
      return true;
    }
    if (shareModal && shareModal.classList.contains('visible')) {
      closeShareModal();
      return true;
    }
    if (histModal && histModal.classList.contains('visible')) {
      closeHistoryModal();
      return true;
    }
    return false;
  }

  function handleModalKeydown(event) {
    const activeModal = getActiveModal();
    if (!activeModal) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeActiveModal();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusable = getModalFocusableElements(activeModal);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function getWelcomeAutoOpenPreference() {
    return readStorageJSON(STORAGE_KEYS.welcomeAutoOpen, true) !== false;
  }

  function setWelcomeAutoOpenPreference(shouldAutoOpen) {
    const ok = writeStorageJSON(STORAGE_KEYS.welcomeAutoOpen, !!shouldAutoOpen);
    if (!ok) {
      showToast(t('errors.storageWrite', {}, 'Could not save changes in this browser session.'), 'warn');
    }
  }

  function syncWelcomePreferenceControl() {
    if (!welcomeDontShow) return;
    welcomeDontShow.checked = !getWelcomeAutoOpenPreference();
  }

  function openWelcomeModal() {
    if (!welcomeModal) return;

    syncWelcomePreferenceControl();

    if (welcomeOpenBtn) {
      welcomeOpenBtn.classList.add('active');
      welcomeOpenBtn.setAttribute('aria-pressed', 'true');
    }

    openModal(welcomeModal, welcomeContinueBtn || welcomeCloseBtn);
  }

  function closeWelcomeModal() {
    if (!welcomeModal) return;

    if (welcomeDontShow) {
      setWelcomeAutoOpenPreference(!welcomeDontShow.checked);
    }

    if (welcomeOpenBtn) {
      welcomeOpenBtn.classList.remove('active');
      welcomeOpenBtn.setAttribute('aria-pressed', 'false');
    }
    closeModal(welcomeModal, welcomeOpenBtn);
  }

  function maybeShowWelcomeModal() {
    if (getWelcomeAutoOpenPreference()) {
      openWelcomeModal();
    }
  }

  function setupWelcomeModal() {
    if (!welcomeModal || setupWelcomeModal._bound) {
      syncWelcomePreferenceControl();
      return;
    }

    if (welcomeOpenBtn) {
      welcomeOpenBtn.addEventListener('click', openWelcomeModal);
    }
    if (welcomeCloseBtn) {
      welcomeCloseBtn.addEventListener('click', closeWelcomeModal);
    }
    if (welcomeContinueBtn) {
      welcomeContinueBtn.addEventListener('click', closeWelcomeModal);
    }
    if (welcomeDontShow) {
      welcomeDontShow.addEventListener('change', function () {
        setWelcomeAutoOpenPreference(!this.checked);
      });
    }

    welcomeModal.addEventListener('click', event => {
      if (event.target === welcomeModal) closeWelcomeModal();
    });

    document.addEventListener('keydown', handleModalKeydown);
    syncWelcomePreferenceControl();
    setupWelcomeModal._bound = true;
  }

  /* ──────────────────────────────────────────────────────────
     Share button & URL state
  ────────────────────────────────────────────────────────── */
  function setupShareBtn() {
    document.getElementById('share-btn').addEventListener('click', openShareModal);
    if (shareCloseBtn) {
      shareCloseBtn.addEventListener('click', closeShareModal);
    }
    shareModal.addEventListener('click', e => {
      if (e.target === shareModal) closeShareModal();
    });
  }

  function closeShareModal() {
    closeModal(shareModal);
  }

  function openShareModal() {
    const url = buildShareURL();
    document.getElementById('share-url-input').value = url;
    document.getElementById('share-embed-code').textContent =
      `<iframe src="${url}" width="1200" height="700" frameborder="0" style="border-radius:10px"></iframe>`;

    const copyBtn = document.getElementById('copy-url-btn');
    openModal(shareModal, copyBtn);
    copyBtn.classList.remove('copied');
    copyBtn.textContent = t('share.copy', {}, 'Copy');
    copyBtn.onclick = async () => {
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        copied = document.execCommand('copy') === true;
        document.body.removeChild(ta);
      }

      if (!copied) {
        showToast(t('share.copyFailed', {}, 'Could not copy link. Please copy it manually.'), 'warn');
        return;
      }

      copyBtn.textContent = t('share.copied', {}, 'Copied!');
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = t('share.copy', {}, 'Copy');
        copyBtn.classList.remove('copied');
      }, 2000);
    };
  }

  function buildShareURL() {
    const params = new URLSearchParams();
    params.set('mode', currentIndicator.id);
    if (comparisonA3s.length) params.set('country', comparisonA3s.join(','));
    if (zoomTransform.k !== 1) {
      params.set('zoom', zoomTransform.k.toFixed(2));
      params.set('x', zoomTransform.x.toFixed(1));
      params.set('y', zoomTransform.y.toFixed(1));
    }
    if (activeGroupFilter) params.set('group', activeGroupFilter);
    return window.location.href.split('#')[0] + '#' + params.toString();
  }

  let pushTimer;
  function pushURLState() {
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => {
      try {
        history.replaceState(null, '', buildShareURL());
      } catch(e) {}
    }, 500);
  }

  function restoreURLState() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    try {
      const params = new URLSearchParams(hash);
      if (params.get('mode')) switchIndicator(params.get('mode'));
      if (params.get('group')) {
        groupSelector.value = params.get('group');
        activeGroupFilter   = params.get('group');
      }
      const countries = params.get('country');
      if (countries) {
        comparisonA3s = countries.split(',').filter(a3 => COUNTRY_NAMES[a3]);
        comparisonMode = comparisonA3s.length >= 2;
        selectedA3     = comparisonMode ? null : (comparisonA3s[0] || null);
        applyMapColors();
        renderSidebar();
        if (isMobileViewport()) setMobileView('data');
      }
      const k = parseFloat(params.get('zoom'));
      const x = parseFloat(params.get('x'));
      const y = parseFloat(params.get('y'));
      if (k && !isNaN(k)) {
        d3.select('#world-map').call(zoom.transform, d3.zoomIdentity.translate(x||0, y||0).scale(k));
      }
    } catch(e) { console.warn('Could not restore URL state', e); }
  }

  /* ──────────────────────────────────────────────────────────
     Export
  ────────────────────────────────────────────────────────── */
  function setupExportBtn() {
    document.getElementById('export-btn').addEventListener('click', openExportMenu);
    document.getElementById('export-csv-btn').addEventListener('click', () => { exportCSV(); document.getElementById('export-menu').style.display = 'none'; });
    document.getElementById('export-png-btn').addEventListener('click', () => { exportPNG(); document.getElementById('export-menu').style.display = 'none'; });
  }

  function openExportMenu() {
    const menu = document.getElementById('export-menu');
    const isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';
    if (!isVisible) {
      document.addEventListener('click', function close(e) {
        if (!e.target.closest('#export-btn') && !e.target.closest('#export-menu')) {
          menu.style.display = 'none';
          document.removeEventListener('click', close);
        }
      });
    }
  }

  function csvCell(value, protectFormula) {
    const raw = value === null || value === undefined ? '' : String(value);
    const normalized = protectFormula && /^[\s\t]*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  function exportCSV() {
    try {
      const ind  = currentIndicator;
      const data = dataCache[ind.id] || {};
      const ranks = rankCache[ind.id] || {};

      let candidates = Object.entries(data);
      if (comparisonA3s.length >= 2) {
        candidates = candidates.filter(([a3]) => comparisonA3s.includes(a3));
      }

      const label = indicatorPlainLabel(ind);
      const header = `ISO-Alpha3,Country,${label},Rank,Region\n`;
      const rows = candidates.map(([a3, val]) => [
        csvCell(a3, true),
        csvCell(COUNTRY_NAMES[a3] || a3, true),
        Number.isFinite(val) ? String(val) : '',
        Number.isFinite(ranks[a3]) ? String(ranks[a3]) : '',
        csvCell(getLocalizedCountryRegion(a3) || '', true)
      ].join(',')).join('\n');

      const blob = new Blob([header + rows], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const date = new Date().toISOString().slice(0,10);
      a.href = url;
      a.download = `world-data-${ind.id}-${date}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('CSV export failed', err);
      showToast(t('export.csvFailed', {}, 'Could not export CSV. Please try again.'), 'warn');
    }
  }

  function exportPNG() {
    try {
      const svgEl = document.getElementById('world-map');
      const W = svgEl.clientWidth;
      const H = svgEl.clientHeight;
      const scale = 2;

      const svgData = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url     = URL.createObjectURL(svgBlob);
      const img     = new Image();

      img.onload = function () {
        try {
          const canvas = document.createElement('canvas');
          canvas.width  = W * scale;
          canvas.height = H * scale;
          const ctx = canvas.getContext('2d');
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);

          // Overlay title
          ctx.fillStyle = '#e2e8f0';
          ctx.font = `bold ${14 * scale / 2}px Segoe UI`;
          const overlayTitle = t('export.pngOverlay', {
            indicator: indicatorPlainLabel(currentIndicator),
          }, `World ${indicatorPlainLabel(currentIndicator)} Explorer`);
          ctx.fillText(overlayTitle, 12, H - 12);

          const pngUrl = canvas.toDataURL('image/png');
          const a = document.createElement('a');
          const date = new Date().toISOString().slice(0,10);
          a.href = pngUrl;
          a.download = `world-${currentIndicator.id}-${date}.png`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } catch (err) {
          console.error('PNG export failed', err);
          showToast(t('export.pngFailed', {}, 'Could not export PNG. Please try again.'), 'warn');
        } finally {
          URL.revokeObjectURL(url);
        }
      };

      img.onerror = function () {
        URL.revokeObjectURL(url);
        showToast(t('export.pngFailed', {}, 'Could not export PNG. Please try again.'), 'warn');
      };

      img.src = url;
    } catch (err) {
      console.error('PNG export setup failed', err);
      showToast(t('export.pngFailed', {}, 'Could not export PNG. Please try again.'), 'warn');
    }
  }

  /* ──────────────────────────────────────────────────────────
     Correlation explorer
  ────────────────────────────────────────────────────────── */
  function setupCorrelationView() {
    const correlBtn = document.getElementById('correl-btn');
    if (!correlBtn) return;

    correlBtn.addEventListener('click', () => {
      if (isMobileViewport()) setMobileView('map');
      const isVisible = correlView.classList.toggle('visible');
      correlBtn.classList.toggle('active', isVisible);
      if (isVisible) renderCorrelation();
    });

    document.getElementById('correl-close').addEventListener('click', () => {
      correlView.classList.remove('visible');
      document.getElementById('correl-btn').classList.remove('active');
    });

    populateCorrelationAxisOptions();

    if (correlView.dataset.bound !== '1') {
      document.getElementById('correl-x-axis').addEventListener('change', function () {
        correlX = getIndicator(this.value);
        renderCorrelation();
      });
      document.getElementById('correl-y-axis').addEventListener('change', function () {
        correlY = getIndicator(this.value);
        renderCorrelation();
      });
      document.getElementById('correl-trend').addEventListener('change', function () {
        showTrendLine = this.checked;
        renderCorrelation();
      });
      document.getElementById('correl-outliers').addEventListener('change', function () {
        showOutliers = this.checked;
        renderCorrelation();
      });
      correlView.dataset.bound = '1';
    }
  }

  function populateCorrelationAxisOptions() {
    ['correl-x-axis', 'correl-y-axis'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;

      const prev = sel.value;
      sel.innerHTML = '';
      INDICATORS.forEach(ind => {
        const opt = document.createElement('option');
        opt.value = ind.id;
        opt.textContent = indicatorPlainLabel(ind);
        sel.appendChild(opt);
      });
      const fallback = id === 'correl-x-axis' ? correlX.id : correlY.id;
      sel.value = INDICATORS.some(ind => ind.id === prev) ? prev : fallback;
    });

    correlX = getIndicator(document.getElementById('correl-x-axis').value);
    correlY = getIndicator(document.getElementById('correl-y-axis').value);
  }

  function renderCorrelation() {
    const xData = dataCache[correlX.id] || {};
    const yData = dataCache[correlY.id] || {};
    const popData = dataCache['population'] || {};

    // Join keys
    const entries = Object.keys(COUNTRY_NAMES)
      .map(a3 => {
        const x = xData[a3], y = yData[a3];
        if (x === undefined || y === undefined) return null;
        const pop = popData[a3] || 5;
        return { a3, x, y, pop, name: COUNTRY_NAMES[a3] || a3, region: getCountryRegion(a3) };
      })
      .filter(Boolean);

    const svgEl = document.getElementById('scatter-svg');
    if (!svgEl) return;
    const totalW = svgEl.clientWidth  || 700;
    const totalH = svgEl.clientHeight || 400;
    const pad = { left: 60, right: 20, top: 20, bottom: 44 };
    const W = totalW - pad.left - pad.right;
    const H = totalH - pad.top  - pad.bottom;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const xVals = entries.map(d => d.x);
    const yVals = entries.map(d => d.y);

    const xScale = d3.scaleLinear().domain([d3.min(xVals)*0.9, d3.max(xVals)*1.05]).range([0, W]);
    const yScale = d3.scaleLinear().domain([d3.min(yVals)*0.9, d3.max(yVals)*1.05]).range([H, 0]);
    const rScale = d3.scaleSqrt().domain([0, d3.max(entries, d => d.pop)]).range([3, 18]);

    const g = svg.append('g').attr('transform', `translate(${pad.left},${pad.top})`);

    // Axes
    g.append('g').attr('class','axis').attr('transform',`translate(0,${H})`)
      .call(d3.axisBottom(xScale).ticks(6).tickFormat(v => fmtVal(correlX, v)));
    g.append('g').attr('class','axis')
      .call(d3.axisLeft(yScale).ticks(5).tickFormat(v => fmtVal(correlY, v)));

    // Axis labels
    g.append('text').attr('x', W/2).attr('y', H + 36)
      .attr('text-anchor','middle').attr('fill','#94a3b8').attr('font-size',11)
      .text(indicatorPlainLabel(correlX));
    g.append('text').attr('transform','rotate(-90)')
      .attr('x', -H/2).attr('y', -44)
      .attr('text-anchor','middle').attr('fill','#94a3b8').attr('font-size',11)
      .text(indicatorPlainLabel(correlY));

    // Trend line
    if (showTrendLine && entries.length > 3) {
      const xMean = d3.mean(entries, d => d.x);
      const yMean = d3.mean(entries, d => d.y);
      const slope = entries.reduce((s,d) => s + (d.x-xMean)*(d.y-yMean), 0) /
                    entries.reduce((s,d) => s + (d.x-xMean)**2, 0);
      const intercept = yMean - slope * xMean;
      const xMin = d3.min(xVals), xMax = d3.max(xVals);
      g.append('line')
        .attr('x1', xScale(xMin)).attr('y1', yScale(slope * xMin + intercept))
        .attr('x2', xScale(xMax)).attr('y2', yScale(slope * xMax + intercept))
        .attr('stroke','#94a3b8').attr('stroke-dasharray','4,3').attr('stroke-width',1.5);

      // R²
      const ssRes = entries.reduce((s,d) => s + (d.y - (slope*d.x + intercept))**2, 0);
      const ssTot = entries.reduce((s,d) => s + (d.y - yMean)**2, 0);
      const r2 = ssTot ? 1 - ssRes/ssTot : 0;
      document.getElementById('corr-stats').textContent = t('correlation.statsR2', {
        r2: fmtNumber(r2, { minimumFractionDigits: 3, maximumFractionDigits: 3 }),
        count: fmtNumber(entries.length),
      }, `R² = ${r2.toFixed(3)} · ${entries.length} countries`);
    } else {
      document.getElementById('corr-stats').textContent = t('correlation.statsCount', {
        count: fmtNumber(entries.length),
      }, `${entries.length} countries`);
    }

    // Outlier detection
    let outlierSet = new Set();
    if (showOutliers && entries.length > 3) {
      const yMean = d3.mean(entries, d => d.y);
      const ySd   = d3.deviation(entries, d => d.y);
      entries.forEach(d => { if (Math.abs(d.y - yMean) > 2 * ySd) outlierSet.add(d.a3); });
    }

    // Dots
    const regionColors = ['#38bdf8','#22c55e','#f59e0b','#a855f7','#f97316','#14b8a6','#ef4444','#64748b'];
    const regions = [...new Set(entries.map(d => d.region))];
    const colorMap = Object.fromEntries(regions.map((r,i) => [r, regionColors[i % regionColors.length]]));

    entries.forEach(e => {
      const cx = xScale(e.x);
      const cy = yScale(e.y);
      const r  = rScale(e.pop);
      const col = colorMap[e.region] || '#64748b';

      if (outlierSet.has(e.a3)) {
        g.append('circle')
          .attr('cx', cx).attr('cy', cy).attr('r', r + 4)
          .attr('fill', 'none').attr('stroke', '#f59e0b').attr('stroke-width', 1.5)
          .attr('opacity', 0.8);
      }

      g.append('circle')
        .attr('cx', cx).attr('cy', cy).attr('r', r)
        .attr('fill', col).attr('opacity', 0.7)
        .style('cursor', 'pointer')
        .on('mouseover', function (ev) {
          d3.select(this).attr('r', r + 2).attr('opacity', 1);
          tooltipEl.style.display = 'block';
          tooltipEl.style.left = (ev.clientX + 12) + 'px';
          tooltipEl.style.top  = (ev.clientY - 30) + 'px';
          tooltipEl.innerHTML  = `<strong>${escapeHtml(e.name)}</strong><br>${escapeHtml(indicatorPlainLabel(correlX))}: ${escapeHtml(fmtVal(correlX, e.x))}<br>${escapeHtml(indicatorPlainLabel(correlY))}: ${escapeHtml(fmtVal(correlY, e.y))}`;
        })
        .on('mouseleave', function () {
          d3.select(this).attr('r', r).attr('opacity', 0.7);
          onMouseLeave();
        })
        .on('click', () => focusCountry(e.a3));
    });
  }

  /* ──────────────────────────────────────────────────────────
     Keyboard shortcuts
  ────────────────────────────────────────────────────────── */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      if ((histModal && histModal.classList.contains('visible')) ||
          (shareModal && shareModal.classList.contains('visible')) ||
          (welcomeModal && welcomeModal.classList.contains('visible'))) {
        return;
      }

      // Ctrl/Cmd+K → focus search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInput.focus();
        searchInput.select();
      }

      // / → focus search
      if (e.key === '/' && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
      // Escape → deselect
      if (e.key === 'Escape' && selectedA3) {
        clearSelection();
      }
    });
  }

  /* ──────────────────────────────────────────────────────────
     Export menu wiring (called by inline onclick in HTML)
  ────────────────────────────────────────────────────────── */
  window._wde = { exportCSV, exportPNG };

  /* ──────────────────────────────────────────────────────────
     Bootstrap
  ────────────────────────────────────────────────────────── */
  init();

})();
