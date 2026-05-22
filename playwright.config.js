const path = require('node:path');
const { pathToFileURL } = require('node:url');

const appUrl = pathToFileURL(path.resolve(__dirname, 'index.html')).href;
const includeVisual = process.env.PW_INCLUDE_VISUAL === '1';

module.exports = {
  testDir: './tests',
  testIgnore: includeVisual ? [] : ['**/visual/**'],
  fullyParallel: false,
  forbidOnly: false,
  retries: 0,
  workers: 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list']
  ],
  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.02,
    },
  },
  use: {
    baseURL: process.env.APP_URL || appUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
};
