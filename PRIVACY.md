# Privacy Statement

## Scope

World Data Explorer is a static frontend application. It does not run a backend service and does not intentionally transmit personal data to a project-owned server.

## Data Stored in Browser

The app stores limited preference and state data in localStorage, including:

- Selected language preference
- Welcome modal auto-open preference
- Watchlist/bookmarks
- Visualization threshold settings

This data remains on the user's device/browser profile.

## Network Requests

The app fetches third-party static assets used for visualization and map topology.

- D3 and TopoJSON are loaded from jsDelivr CDN
- World topology JSON is requested from a jsDelivr-hosted package

These requests may expose standard technical metadata (for example IP address and user agent) to the CDN provider, according to that provider's policies.

## Clipboard and Exports

- The Share feature can copy URLs to clipboard on user action.
- Export actions generate files locally (CSV/PNG) in the user environment.

## Cookies and Tracking

This project does not intentionally set tracking cookies or implement analytics trackers.

## User Controls

Users can clear browser storage to remove local app state and preferences.
