# Initial build handoff — October 4, 2026

## Delivered

Phase 0 workspace and architecture decisions, plus an intentionally isolated local core-loop preview. Expo SDK 57 / React Native 0.86.3 / React 19.2.3 / TypeScript 6.0.3; strict shared contracts/domain/fixture packages; frozen pnpm lockfile; native variant configuration and EAS profiles; five functional tabs; source spec/backlog/boards in the repository; GitHub Actions client/domain and local-database checks.

The preview includes optional sample-history setup, local title search and hard runtime/genre/format filters, title detail, Liked/Fine/Disliked logging, unknown historical dates, explicit rewatch/private notes, TV status and seen-enough eligibility, local watchlist priority/sorts, separate movie/TV rank lists with Top 10/25/50/All, comparison sessions with Done/skip/undecided/similar/undo, profile history, local export/reset controls. SQLite on native and localStorage on web save before feedback. Sample scores come from actual fixture evidence, not the numbers printed on the ImageGen boards.

The pure domain solver implements deterministic regularized Bradley–Terry, sentiment priors, active opinion-revision evidence, one current observation per pair, sparse gradients/Armijo backtracking, connected-component evidence labels, fixed versioned 0–10 logistic score and unplaced nulls. List, detail and profile share canonical snapshots. Preview artwork is original abstract geometry. No third-party artwork or vendor calls are made.

Supabase has a local config, internal schema/grants foundation, version RPC, four SQL checks and an authenticated synthetic Edge portability smoke. No production data tables, client credentials, hosted project refs or staging deployment are present.

## Checks actually run

- Frozen-lockfile install: passed. Native peer alignment: no peer dependency issues. Expo dependency compatibility check: passed against the installed SDK map.
- ESLint, root/workspace strict TypeScript, 19 domain unit tests: passed.
- iOS Hermes bundle and web production export: passed. These are bundle checks, not native binary builds.
- iOS prebuild with no pod install: passed. Generated app target/Podfile properties use iOS 17.0. Generated native files are gitignored and reproducible from config.
- Neutral Edge module generation and a Deno test of the shared ranking source: passed. No staging function was deployed.
- Ranking benchmark: 2,000 titles / 10,000 synthetic pairs, 32 iterations, converged gradient norm approximately 5.67e-6; observed 25–38 ms on this Mac. This does not validate Supabase-hosted CPU budgets.
- Phone-width browser preview: inspected Home, Rank, detail and comparison layouts; exercised search → log → persisted success → Done and automatic watchlist removal; comparison submission and undo. Logging remained available after reload and the saved title became eligible for comparison.
- Impeccable mechanical UI detector: no findings. Native accessibility/device verification remains open.
- [GitHub Actions for initial app commit `4cd648d`](https://github.com/amadan95/Seen/actions/runs/37244710281): both client/domain and database jobs passed, including Supabase startup, migration reset and four pgTAP assertions on the Linux runner.

## Explicitly unverified / not implemented

- This host has Apple command-line tools, but no full Xcode/iOS simulator. No native compile, CocoaPods install, signing, physical iPhone run, Apple auth, VoiceOver, Dynamic Type or native SQLite crash/restart QA is claimed.
- Docker and Podman are absent on this Mac. Local migration reset and pgTAP execution remain unavailable here; both passed on GitHub's Linux runner as linked above.
- Hosted Supabase staging/production, EAS ownership/signing, vendor access, authentication and source approvals need owner configuration.
- The preview store is not the production user-partitioned cache/outbox. There is no remote sync, conflict API, actor-bound receipt or account lifecycle. Do not import these fixture IDs directly into production data.
- The preview picker uses nearest display-score candidates and current/session exclusions. Production adaptive brackets, persistent cooldowns, bridge scheduling and server-authoritative sessions/snapshots remain tasks 10–12. Domain ranking tests do not constitute full task 10 acceptance.
- Authentication, production logging/watchlist services, TMDB/provider cache, social projections/moderation, telemetry, secure export/account deletion and release hardening remain backlog increments.
- Dark mode is the specified initial default. The icon remains an existing provisional concept. Streaming and friend modules are gated rather than populated with fictitious data.

## Next increment

Finish task 01's outstanding native/device and staging checks, then implement task 02 (identity/settings/security schema with grants/RLS and actor fixtures), followed by native auth task 03. Reuse the existing UI and pure domain after connecting accepted production contracts. Tasks 23–28 remain deferred.

No App Store/TestFlight submission, public hosting deployment, paid provisioning or vendor-permission assertion was performed.
