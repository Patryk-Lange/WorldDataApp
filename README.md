# World Data Explorer

Interactive frontend application for comparing global indicators (GDP, inflation, unemployment, and more) across countries on a D3-powered world map.

## Features

- Choropleth world map with country selection and multi-country comparison (up to 5)
- Search, regional/group filtering, value filters, watchlist/bookmarks, and URL state sharing
- Historical trend modal with world and regional reference overlays
- Correlation view, CSV export, and PNG map export
- English/Polish localization with persisted language preference
- Welcome guide modal with user-controlled auto-open behavior
- Installable PWA with service-worker caching for faster repeat loads and offline resilience

## Tech Stack

- Vanilla JavaScript (IIFE architecture)
- D3 v7 and TopoJSON client
- Static HTML/CSS
- Playwright end-to-end testing

## Project Structure

- index.html: application shell and accessibility landmarks
- css/style.css: layout and component styling
- js/app.js: core runtime, state, interactions, and rendering
- js/i18n.js: translations and locale runtime
- data/: indicator datasets
- tests/: Playwright smoke and critical suites
- docs/test-plan.md: QA plan and readiness criteria
- docs/traceability-matrix.md: requirement-to-test mapping

## Getting Started

### Prerequisites

- Node.js 18.18+
- npm 9+

### Install

```bash
npm ci
npx playwright install
```

### Run Locally

```bash
npm run start
```

Open http://localhost:4173

### Quality Gates

```bash
npm run lint
npm run test:smoke
npm run test:critical
npm run test:all
```

## Security and Privacy

- Security policy: see SECURITY.md
- Privacy statement: see PRIVACY.md

## Notes

- The app is frontend-only and stores user preferences in localStorage.
- Data values and availability depend on bundled static datasets.
