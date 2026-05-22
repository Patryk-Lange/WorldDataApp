# Requirement Traceability Matrix

## Legend
- Coverage: Full / Partial / Gap / N/A
- Priority: Critical / Important / Nice-to-have

| Req ID | Requirement / Risk | Priority | Automated Coverage | Coverage | Notes |
|---|---|---|---|---|---|
| R-01 | App loads and map renders | Critical | tests/e2e-simple.spec.js (Test 1, 6), tests/e2e-critical.spec.js (map failure fallback) | Full | Includes success + failure mode |
| R-02 | Indicator mode switching integrity | Critical | tests/e2e-simple.spec.js (Test 7, 8, 12, 19) | Full | Mode state assertions included |
| R-03 | Country selection + detail metrics | Critical | tests/e2e-simple.spec.js (Test 22), tests/e2e-critical.spec.js (multiple tests use search/select) | Full | Multi-indicator validation for BRA/AUS |
| R-04 | Share URL correctness + state restore | Critical | tests/e2e-critical.spec.js (share restore, hash restore) | Full | Covers mode/country/group restore |
| R-05 | Share copy reliability with fallback | Critical | tests/e2e-critical.spec.js (clipboard failure fallback) | Full | Validates execCommand fallback path |
| R-06 | CSV export validity | Critical | tests/e2e-critical.spec.js (CSV export test) | Full | Header + non-empty content verified |
| R-07 | PNG export validity | Critical | tests/e2e-critical.spec.js (PNG export test) | Full | Download and byte-size validation |
| R-08 | Comparison flow and max limit | Critical | tests/e2e-critical.spec.js (comparison max 5) | Full | Eviction of oldest selection covered |
| R-09 | Bookmark persistence | Critical | tests/e2e-critical.spec.js (bookmark persistence) | Full | Reload persistence verified |
| R-10 | Bookmark max-limit protection | Critical | tests/e2e-critical.spec.js (bookmark max limit toast) | Full | Non-blocking warning path verified |
| R-11 | Filter behavior boundaries | Important | tests/e2e-critical.spec.js (impossible min/max + reset, exact equality boundaries) | Full | Equality boundary handling verified |
| R-12 | Group filter behavior | Important | tests/e2e-critical.spec.js (G7 top-list constrained + membership validation) | Full | Rendered rows validated against G7 membership |
| R-13 | Correlation explorer behavior | Critical | tests/e2e-critical.spec.js (render + trend toggle stats) | Partial | Additional outlier/axis edge checks pending |
| R-14 | History modal behavior | Important | tests/e2e-critical.spec.js (open + zoom + close, world/region guide toggles) | Full | Reference-line rendering semantics covered |
| R-15 | Currency conversion behavior | Important | tests/e2e-critical.spec.js (USD->EUR value change, non-currency invariance) | Full | Currency and non-currency behavior both verified |
| R-16 | Mobile layout and navigation | Critical | tests/e2e-simple.spec.js (Test 23-25) | Full | Overflow/toggle/size baseline covered |
| R-17 | Offline/online status signaling | Important | tests/e2e-critical.spec.js (offline/online status) | Full | Event-driven visibility validated |
| R-18 | Keyboard shortcuts | Important | tests/e2e-critical.spec.js (focus search + escape clear, map arrow navigation + Enter select) | Full | Core shortcuts and map keyboard flow covered |
| R-19 | Locale-sensitive stability | Critical | tests/e2e-simple.spec.js + tests/e2e-critical.spec.js beforeEach | Full | Deterministic EN enforced |
| R-20 | Role/permission differences | Nice-to-have | N/A | N/A | No role model exists in current app |
| R-21 | Search no-results guidance | Important | tests/e2e-critical.spec.js (no-results guidance message) | Full | Empty search state now explicitly surfaced to users |
| R-22 | Destructive action guardrails | Important | tests/e2e-critical.spec.js (watchlist clear-all confirmation) | Full | Clear-all requires explicit second action |

## Unverifiable Without Additional Requirements
- Formal business rules for each indicator beyond UI behavior.
- SLA/performance thresholds.
- Accessibility conformance target (e.g., WCAG level).
