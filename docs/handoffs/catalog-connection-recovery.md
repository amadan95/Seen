# Local catalog connection recovery — October 6, 2026

The supplier used by Seen is TMDB (including JustWatch-powered US provider summaries).
The existing key is configured and remains solely in the ignored server environment.

## Causes and fixes

- The previously installed native Release build intentionally set catalogUrl to
  undefined via the existing **DEV** guard. It could only show cached/sample data.
  Rebuilt and installed SeenDev in Debug on the iPhone 18 Pro simulator, preserving
  local SQLite data, and connected it to Metro at localhost:8082.
- The local catalog process was stopped. Restarted the loopback-only bridge on 8787.
- The local browser was on port 8092, outside the bridge's original 8081–8083 CORS
  allowlist. Added only 8092 through a small tested explicit local-origin policy.
  Arbitrary ports, remote/spoofed origins and nonloopback server binding remain denied.
- Restored the existing web preview server at localhost:8092. Reloading hydrated
  cached titles with real posters, metadata and viewing summaries. Release behavior
  remains unchanged; no unauthenticated local bridge is enabled in a release build.

## Actual checks

- pnpm check: lint, strict TypeScript and **70 tests across 9 files passed**.
  New origin tests cover all four supported ports on both loopback hostnames and
  reject remote/spoofed/malformed/unlisted origins.
- Live GET /catalog/preview with Origin localhost:8092 returned HTTP 200 with its
  matching Access-Control-Allow-Origin: all 15 preview titles included poster URLs,
  synopsis, cast and available US viewing summaries (196 supplier offer entries).
  An actual poster HEAD returned HTTP 200 image/jpeg. Spoofed-origin health returned
  HTTP 403. These observations do not establish a user's subscription entitlements.
- Browser Moon detail visibly displayed the real poster, provider logos, runtime,
  synopsis and cast/details controls. [Screenshot](../screenshots/catalog-restored-web.jpg).
- Xcode Debug arm64 iOS simulator build: BUILD SUCCEEDED. Installed and connected to
  Metro without uninstalling/resetting user data. Device Hub showed the native app
  running; Moon detail had the real poster, runtime, synopsis and US provider entries.
- No dependency or lockfile changes, client credential, hosted deployment, paid
  provisioning or Apple submission. Build log: /private/tmp/seen-ios-live-debug.log.

## Running locally

Keep pnpm catalog:dev and pnpm dev:simulator running for the simulator. The web preview
uses port 8092, also explicitly allowed. Stopping these local processes interrupts
live data; cached data remains available. A physical iPhone/Release distribution
still needs the planned authorized hosted backend and production catalog services.
The initial library, identity mappings, logs and ranking evidence were preserved.
