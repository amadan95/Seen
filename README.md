# Seen

An iPhone-first movie and TV memory: **find → log → compare → choose the next watch**.

This development build contains an Expo/React Native app, five functional tabs, a local TMDB search/detail bridge, durable local logging and watchlist, a Bradley–Terry ranking preview with automatic Rank Scores, shared contracts, owner-only Supabase identity/settings primitives, and CI. It follows the supplied [spec](docs/spec.md), [backlog](docs/backlog.md), and [v2 wireframes](docs/reference).

**This is a local development preview, not a production backend or public-release MVP.** The optional sample catalog/history are illustrative. With your local TMDB credential, Home, Discover, rankings, history and watchlists use real artwork. Detail pages load runtime, genres, synopsis, credits, trailers, TV counts and US viewing options. Live auth, social, server rankings, offline synchronization, and account deletion are not connected. No credentials are needed for the sample mode.

## Run

Use Node 22.13+ (Node 24 recommended) and pnpm 11.25.0.

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm web
```

The web target is a development aid for checking the shared native screens, not a consumer web launch. Choose **Explore with sample history** to see existing ranks, or **Start my own local library** for an empty library. Use Settings to export, replace or clear only this preview's local data.

## Live catalog locally

Put `TMDB_API_KEY=your-key` in `supabase/functions/.env` (gitignored). A v3 API key or API Read Access Token is supported. Copy `apps/ios/.env.example` to `apps/ios/.env` to enable the public loopback address in development builds. Start the bridge in a separate terminal, then restart Metro:

```sh
pnpm catalog:dev
# Another terminal:
pnpm dev:simulator
```

Discover defaults to **Live catalog** when configured and also offers **Sample catalog**. Live search is debounced, paginated, adult-excluded and separated by format; hard runtime filters hydrate movie details and exclude unknown durations. Detail loads real metadata/posters; log/watchlist/compare work with retained title metadata after an app restart. Keep both sample and live library data local; there is no automatic migration to production.

The bridge binds only to `127.0.0.1:8787`, for the iOS Simulator and local web preview. It is disabled in release bundles and must not be deployed or exposed on a network. A physical iPhone needs a separately configured authorized backend. `.seen-dev/identities.json` persists only namespaced supplier-to-UUID mappings; do not delete it while using a saved local library. Upstream caches are bounded and held in memory, with stale data explicitly labeled. Production catalog tables, distributed limits/cache expiry, production people/catalog/provider services and supplier launch approvals remain task 04 onward. Local detail hydration includes credits/videos and JustWatch-powered US provider summaries, with attribution, checked time, cache labels, and safe source links. Existing sample title IDs stay intact while their artwork and metadata refresh. See [the continuation handoff](docs/handoffs/local-catalog-native.md).

For the actual iOS development build, install Xcode 26.4+, select its command-line tools, then:

```sh
pnpm ios
# After installing a development build in the simulator:
pnpm dev:simulator
```

The app targets iOS 17+. SDK 57 uses React Native 0.86.3 and React 19.2.3. The development build has been compiled and exercised on Xcode 27 / iOS 27 in Device Hub, with scene lifecycle support enabled. See the [continuation handoff](docs/handoffs/local-catalog-native.md#resume-the-simulator-preview) for reconnecting the installed simulator app. Expo Go from the App Store is not the validation path; use a native development build. [Runtime decisions](docs/decisions/001-foundation.md) document the toolchain and deployment gates.

For EAS, link an owner-controlled Expo project first, then run an iOS `development` or `simulator` build from `apps/ios`. Development, staging and production use different app IDs/schemes. The production profile is scaffolding; it still contains the preview and must not be released.

## Validate

```sh
pnpm check
pnpm benchmark
pnpm --filter @seen/ios export:ios
pnpm --filter @seen/ios export:web
pnpm edge:bundle
deno test supabase/functions/preview-smoke/smoke.test.ts
```

With Docker Desktop or Podman running:

```sh
pnpm exec supabase start
pnpm exec supabase db reset --local
pnpm exec supabase test db
```

The database now includes profiles, owner-only settings, private preference revisions, a US region catalog and actor-bound bootstrap/update RPCs. Direct client writes are denied, including account-state changes; version checks protect profile/settings updates. The Edge function remains an authenticated synthetic portability smoke, not a rank/catalog API. Generate its bundle from the shared package before serving/deploying it. Never hand-edit the generated bundle.

## Repository

- `apps/ios`: Expo Router routes, owned components, local persistence and native configuration.
- `packages/contracts`: Zod media, state, error, cursor and mutation schemas.
- `packages/domain`: pure library rules, ranking solver, score transform and fixture comparison picker.
- `packages/fixtures`: small illustrative catalog and explicitly selected sample history.
- `packages/catalog`: portable TMDB adapter with input/response validation, bounded per-process cache/request budget and safe errors.
- `supabase`: local configuration, foundation migration, SQL checks and Edge smoke.
- `docs`: source specifications, visual references, architecture and [initial handoff](docs/handoffs/initial-build.md).

Local saves are acknowledged after SQLite commits on native or localStorage succeeds on the web preview. This store has no remote outbox, account partitioning or encrypted database guarantee. It must be replaced behind services as the production backlog progresses. Scores in list/detail/profile use the same canonical snapshot; filters never refit, and uncompared titles have no score.

Next: task 03 native authentication once a local or hosted Supabase runtime is configured; then complete task 04's production catalog persistence and authorized services. Physical-device/staging acceptance, supplier permissions, Apple signing and Expo ownership remain configuration gates. Scene support is enabled for builds made with Xcode 27; native directories remain generated from configuration.

Sentiment logging automatically opens title placement. Ranked titles with shared genres are preferred as comparison anchors; skips continue until an answer supplies a provisional score, then the matching ranking opens. TV requires explicit seen-enough confirmation. A first title remains saved and unscored until another eligible title exists.

See [live posters and availability validation](docs/handoffs/live-posters-availability.md) for coverage, caching behavior and remaining limits.
