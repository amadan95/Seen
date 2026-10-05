# Local catalog and native continuation — October 4, 2026

Later increment: [real artwork and streaming availability](live-posters-availability.md) now hydrates existing sample titles, credits, trailers and US viewing summaries. The notes below describe the earlier increment.

## Scope

The owner requested continued local development after installing Xcode and adding a TMDB key. No hosted Supabase project is configured. Task 02 identity/security primitives are implemented. A local catalog bridge extends the preview while task 03 auth and the production task 04 cache/services remain pending; it does not bypass those production dependencies or claim their acceptance.

## Identity foundation

Migration `20261005000100_identity.sql` adds profiles, user settings, a supported US region and internal preference revisions. Authentication derives the actor from `auth.uid()`. Profile bootstrap serializes same-actor retries and atomically creates defaults. Owner RPCs validate constraints and base versions, hold the account row during writes, and deny suspended/deletion-pending/deleted accounts. Case-insensitive usernames, private defaults and opt-in processing choices are enforced in SQL and contracts.

Raw profiles/settings are owner-readable only. Clients have no direct write grants or private-schema access. A narrowly granted NOLOGIN role owns the security-definer RPCs, has no BYPASSRLS and cannot create public objects. No service-role key is used. Genre/person preferences require task 04 dictionaries; avatar asset ownership and social-safe projections remain later increments.

## Local TMDB preview

`pnpm catalog:dev` reads the ignored `supabase/functions/.env`, binds only to 127.0.0.1:8787, and exposes bounded search/browse/detail routes. It supports a v3 API key or read-access bearer token. Input, vendor responses and app contracts are validated. Credentials and raw vendor errors/URLs stay out of responses/logs. CORS accepts only local preview origins; request and upstream budgets are bounded. This is a simulator/web development bridge, never a deployed server or a physical-device endpoint.

The portable `packages/catalog` adapter separates movie and TV supplier IDs, excludes adult entries, preserves nullable dates/runtime, uses source image configuration, cancels timed-out upstream I/O, collapses pending requests, and preserves bounded stale data during 429/outage/malformed responses. Its cache and limits are process-local. Hosted distributed budgets, legally capped metadata retention, persistent hydration tables, person/credit/video/provider endpoints and staging services remain task 04–05.

The bridge's ignored `.seen-dev/identities.json` stores server-generated UUID mappings independently of vendor payloads. Keep it while using a local library. Discover offers live/sample modes, 250 ms debounce/cancellation, format/genre/runtime filters and pagination. Unknown movie runtime cannot pass a hard filter. Native detail uses real posters and full metadata; missing artwork/overview/year is explicit. Logging, watchlist, comparisons, ranks and history now share the local catalog. A durable personal mutation includes referenced live metadata in the same SQLite/localStorage payload. Existing preview libraries parse with an empty catalog field; sample IDs are never imported as production IDs.

## Native tooling

Xcode 27.0 and the iOS 27 runtime are installed. The GUI is Xcode's **Device Hub** (`com.apple.dt.Devices`), replacing the old Simulator application path on this installation. CocoaPods 1.16.2 was installed in `/private/tmp/seen-native-tools`, with Ruby-2.6-compatible dependencies; no system Ruby or global gems were changed. This temporary setup is a build aid, not a repository dependency. Standard local development should use a maintained Ruby/CocoaPods installation.

The first native build compiled, then hit UIKit's required scene-lifecycle startup trap on iOS 27. The fix is Expo's supported `expo-build-properties` option `ios.enableSceneSupport: true`, with the existing stable SDK 57 packages. Native directories are regenerated from config, not committed. See [Expo's migration guidance](https://github.com/expo/fyi/blob/main/ios-scene-lifecycle.md).

## Validation

- ESLint, strict workspace TypeScript and 29 unit tests passed, including catalog collision/nullability/adult/rate-limit/cache/runtime cases and old-library compatibility.
- A bounded live TMDB search returned real movie results through the local bridge; no key was displayed or embedded in the client.
- Both local key files and the identity map are ignored by Git. Native build artifacts remain ignored.
- The scene-support native build succeeded and launches on the iPhone 18 Pro simulator with iOS 27. Verified a fresh local library, live Stalker/Arrival search, detail hydration and real posters, watchlist save, sentiment logging, optional comparison and provisional ranking. A full app restart retained live title metadata, logs, the comparison and both provisional scores in SQLite. Scores were absent before comparisons and hidden during choices.
- [GitHub CI run 37248144202](https://github.com/amadan95/Seen/actions/runs/37248144202) passed both jobs: client checks, bundles and Edge smoke, plus a real Supabase database reset and all 49 pgTAP checks (45 identity/grant/RLS checks and four foundation checks). Docker/Podman are absent on this Mac; database runtime verification happened in CI.
- About Seen includes TMDB's approved, unmodified blue short logo and attribution notice. Search and detail retain source information.

## Resume the simulator preview

The existing development app is installed as `com.amadan95.seen.development`. Keep the local bridge and Metro running in separate terminals:

```sh
pnpm catalog:dev
# Another terminal:
pnpm dev:simulator
# If the installed app needs to reconnect:
xcrun simctl openurl booted 'seen-development://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8082'
```

`dev:simulator` pins IPv4-first DNS because Node 24's IPv6-only localhost listener otherwise conflicts with Expo's IPv4 bundle URL on this installation. Open the app in Xcode's Device Hub. Native code/config changes require a rebuild; ordinary TypeScript changes reload through Metro.

## Next dependencies

The owner chose continued local development without a hosted Supabase project. Task 03 still needs a local Supabase runtime or an owner-configured hosted project for actual authentication and session checks. Physical-device testing, VoiceOver/large-text QA, production catalog services and staging remain pending. No cloud project, authentication account, Apple signing, paid provisioning, deploy, or App Store submission has been created.
