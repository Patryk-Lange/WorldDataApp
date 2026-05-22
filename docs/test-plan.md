# World Data Explorer - End-to-End Test Plan

## 1. Purpose and Quality Goals
This plan defines how end-to-end testing provides release confidence for the World Data Explorer web app.

Primary goals:
- Prevent production regressions in core exploration workflows.
- Validate critical user outcomes under normal and failure conditions.
- Ensure data rendering, localization, sharing, and export are reliable.
- Detect integration failures early (network, browser APIs, storage).

## 2. Scope
### In scope
- App bootstrap, map rendering, and indicator mode switching.
- Country search/select, detail panel, top list, legend, filters.
- Search empty-state guidance for unmatched queries.
- Comparison workflow and max-cap behavior.
- Watchlist/bookmarks persistence and limits.
- Destructive-action guardrail for watchlist clear-all.
- Share URL generation/restore and copy behavior.
- CSV/PNG export.
- Correlation explorer and history modal behavior.
- Currency conversion behavior.
- Mobile layout and mobile navigation behavior.
- i18n defaulting and deterministic locale testing strategy.
- Offline/online status behavior.

### Out of scope
- Back-end contract testing (app is static-data driven in this workspace).
- Cross-browser matrix expansion beyond Playwright default browser profile.
- Security penetration testing.
- Load/performance benchmarking at scale.

## 3. Test Levels and Suites
- Smoke suite: baseline rendering and core controls. Implemented in tests/e2e-simple.spec.js.
- Critical regression suite: business-critical and failure-prone paths. Implemented in tests/e2e-critical.spec.js.

## 4. Test Environment
- Runner: Playwright.
- Config: playwright.config.js.
- URL source: dynamic local file URL via config (override with APP_URL env when needed).
- Deterministic locale: tests set localStorage keys wde_lang=en and wde_lang_manual=1 before page load.

## 5. Data Strategy
- Core country checks: BRA, AUS, USA, CAN, DEU, FRA, CHN, JPN.
- Group checks: G7.
- Boundary and limits:
  - Comparison max countries = 5
  - Bookmarks max = 10
  - Filter min/max impossible bounds
- Failure simulation:
  - World map topology request aborted
  - Clipboard API forced failure with fallback validation
  - Offline/online event transitions

## 6. Risk-Based Priority
### P0 - Release-blocking
- App initialization and map data loading fallback.
- Indicator correctness and country detail rendering.
- URL share/restore correctness.
- Export availability and file validity (CSV/PNG).
- Bookmark persistence and limit enforcement.
- Comparison flow and max-cap behavior.
- Correlation explorer functional integrity.

### P1 - High
- Filter and group constraints.
- History modal rendering and controls.
- Currency conversion UI correctness.
- Offline status signaling.
- Keyboard shortcut reliability.

### P2 - Medium
- Additional visual and UX consistency checks.
- Extended locale matrix (EN + PL assertions).

## 7. Entry Criteria
- Feature code merged and app bootstraps locally.
- Data files present and accessible.
- Playwright dependencies installed.

## 8. Exit Criteria
- 100% pass on smoke and critical suites.
- No open defects with severity Critical/High.
- No flaky failures in two consecutive full-suite runs.
- Failed scenarios mapped to defects with owner and ETA.

## 9. Defect Severity Guidance
- Critical: blocks core navigation/exploration or corrupts user output (share/export/data mismatch).
- High: major workflow degradation with workaround.
- Medium: partial UX or non-core flow issue.
- Low: cosmetic or minor text/layout issue.

## 10. Regression-Sensitive Areas
- i18n/locale initialization and text assertions.
- Country ID mapping and no-data behavior.
- URL hash state restore.
- Storage-backed persistence (bookmarks, thresholds, language).
- Browser API fallbacks (clipboard, offline/online).

## 11. Traceability
See docs/traceability-matrix.md for requirement-to-test mapping and current coverage state.

## 12. Non-Functional Enhancements (Optional)
- Add explicit PL locale assertions as a dedicated suite.
- Add visual regression snapshots for critical screens.
- Add non-functional performance budget checks once target thresholds are defined.
