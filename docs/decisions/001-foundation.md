# ADR 001 — Expo foundation and a clearly isolated local preview

Date: October 4, 2026. Status: accepted for the initial implementation; release gates remain open.

The supplied specification selects Expo/React Native/TypeScript, Expo Router and Supabase. Use a pnpm workspace with contracts/domain/fixtures packages. The client uses native iOS tabs, SF Symbols, native stacks and sheets; React Native primitives own the content. A web target exists only to validate shared screens on a machine without Xcode.

Pinned SDK: Expo 57.0.26; React Native 0.86.3; React 19.2.3; TypeScript 6.0.3; Expo Router 57.0.24. TypeScript 6 is selected because the installed lint tooling does not support TypeScript 7. The frozen lockfile and explicit native peer overrides avoid unconstrained transitive native upgrades. [Expo SDK reference](https://docs.expo.dev/versions/latest/) and [SDK 57 release](https://expo.dev/changelog/sdk-57) were checked when choosing these versions.

Runtime floor: iOS 17.0, configured with expo-build-properties. This is independent of submission/build SDK: Expo SDK 57 documents Xcode 26.4+; Apple currently requires iOS 26 SDK or later for submissions. Recheck [Apple requirements](https://developer.apple.com/news/upcoming-requirements/) before any release. Full Xcode is absent on this host, so a successful JS export is not a successful native build.

The initial useful artifact extends the minimal shell with local fixture-backed core interactions. It is intentionally labeled a local preview, not an acceptance claim for tasks 02–22. No production tables, RLS, auth, remote sync or social are approximated by client-only state. Those increments continue in backlog order. We use SQLite on native and localStorage on web, with persist-before-feedback and serialized local mutations. This is not the spec's production outbox.

Ranking code is single-copy pure TypeScript. esbuild produces neutral ES2022 modules for Edge; a Deno smoke exercises the bundled source. The local solver implements the specified priors, regularization, Armijo backtracking, opinion-revision filtering, evidence labels and fixed logistic Rank Score transform. The initial picker only excludes active/session-seen pairs and chooses nearby candidates; production bracket rebuilding, cooldowns, bridge scheduling and server sessions remain task 10/11 work. Large-fixture speed on a Mac does not establish hosted Edge CPU capacity.

Privacy and account data remain local. Backend configuration contains no secrets and different native variants have different bundle IDs/schemes. Actual staging/production Supabase project refs must be distinct and configured by the owner. No hosting deployment or Apple submission has been made.

Vendor gates: written TMDB commercial/recommendation permissions, attribution and supplier caching/retention terms; regional availability/JustWatch credit/link requirements; advanced AI rights deferred. No real catalog payloads or streaming offers are fetched. Preview metadata is illustrative, and geometric poster art is original. Existing icon concepts are preserved; the configured eye icon is provisional and needs final brand approval.
