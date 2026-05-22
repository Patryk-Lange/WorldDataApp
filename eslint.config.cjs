const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: [
      'node_modules/**',
      'playwright-report/**',
      'test-results/**',
      'data/**/*.js',
      'js/app.js.bak',
    ],
  },
  js.configs.recommended,
  {
    files: ['js/**/*.js', 'tests/**/*.js', 'playwright.config.js', 'service-worker.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.serviceworker,
        d3: 'readonly',
        topojson: 'readonly',
        INDICATORS: 'readonly',
        CURRENCIES: 'readonly',
        REGIONS: 'readonly',
        COUNTRY_NAMES: 'readonly',
        ISO_NUM_TO_A3: 'readonly',
        GDP_DATA: 'readonly',
        GDP_PER_CAPITA_DATA: 'readonly',
        INFLATION_DATA: 'readonly',
        UNEMPLOYMENT_DATA: 'readonly',
        POPULATION_DATA: 'readonly',
        TRADE_BALANCE_DATA: 'readonly',
        GDP_HISTORY: 'readonly',
        INFLATION_HISTORY: 'readonly',
        UNEMPLOYMENT_HISTORY: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
      // The app uses a classic multi-script global architecture.
      // Keep lint focused on syntax/logic hazards without false positives.
      'no-undef': 'off',
      'no-unused-vars': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
