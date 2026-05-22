# Security Policy

## Supported Versions

This project currently supports the latest state of the default branch.

## Reporting a Vulnerability

If you discover a security issue, report it privately and do not open a public issue with exploit details.

Include:

- A clear description of the issue
- Affected files and paths
- Reproduction steps
- Potential impact
- Suggested remediation (if available)

## Response Expectations

- Initial triage acknowledgement: within 5 business days
- Validation and severity assessment: as soon as reproducible
- Fix timeline: based on severity and release cadence

## Security Hardening in This Repo

- Content Security Policy and referrer policy in index.html
- Subresource Integrity (SRI) on CDN-loaded scripts
- Non-blocking UI feedback in place of blocking dialogs for safer UX flows
- Automated E2E regression checks through Playwright
- CI workflow to enforce lint and test gates on pushes and pull requests
