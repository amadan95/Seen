# Seen

An iPhone-first movie and TV memory: **find → log → compare → choose the next watch**.

This initial build contains an Expo/React Native app, five functional tabs, local catalog search/detail, durable local logging and watchlist, a Bradley–Terry ranking preview with automatic Rank Scores, shared contracts, a Supabase foundation, and CI. It follows the supplied [spec](docs/spec.md), [backlog](docs/backlog.md), and [v2 wireframes](docs/reference).

**This is a local development preview, not a production backend or public-release MVP.** The catalog and optional sample history are illustrative. Live auth, TMDB, social, server rankings, offline synchronization, and account deletion are not connected. No credentials are needed to explore it.

## Run

Use Node 22.13+ (Node 24 recommended) and pnpm 11.25.0.

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm web
```

The web target is a development aid for checking the shared native screens, not a consumer web launch. Choose **Explore with sample history** to see existing ranks, or **Start my own local library** for an empty library. Use Settings to export, replace or clear only this preview's local data.

For the actual iOS development build, install Xcode 26.4+, select its command-line tools, then:

```sh
pnpm ios
# After installing a development build on a device:
pnpm dev
```

The app targets iOS 17+. SDK 57 uses React Native 0.86.3 and React 19.2.3. Expo Go from the App Store is not the validation path; use a native development build. [Runtime decisions](docs/decisions/001-foundation.md) document the toolchain and deployment gates.

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

The initial database deliberately contains only a permission-restricted version RPC and an internal schema. User tables/RLS start with backlog task 02. The Edge function is an authenticated synthetic portability smoke, not a rank API. Generate its bundle from the shared package before serving/deploying it. Never hand-edit the generated bundle.

## Repository

- `apps/ios`: Expo Router routes, owned components, local persistence and native configuration.
- `packages/contracts`: Zod media, state, error, cursor and mutation schemas.
- `packages/domain`: pure library rules, ranking solver, score transform and fixture comparison picker.
- `packages/fixtures`: small illustrative catalog and explicitly selected sample history.
- `supabase`: local configuration, foundation migration, SQL checks and Edge smoke.
- `docs`: source specifications, visual references, architecture and [initial handoff](docs/handoffs/initial-build.md).

Local saves are acknowledged after SQLite commits on native or localStorage succeeds on the web preview. This store has no remote outbox, account partitioning or encrypted database guarantee. It must be replaced behind services as the production backlog progresses. Scores in list/detail/profile use the same canonical snapshot; filters never refit, and uncompared titles have no score.

Next: finish task 01's real-device/database/staging acceptance checks, then task 02 identity/security and task 03 native auth. Supplier permissions, Apple signing, Expo accounts and hosted Supabase environments remain owner configuration gates.
