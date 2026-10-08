# UI cleanup, collections and journal — October 8, 2026

## Delivered

The approved cleanup keeps Festival Programme and Home's feature/rail composition. Four tabs are Home, Discover, Rankings and Watchlist; Profile is now a pushed journal route at /profile, reachable from Home. Its duplicate stack heading was removed. Home has one Tonight entry and a pending-placement inset only when needed; recent history and general refinement no longer compete with its artwork.

Shared scrolling sheets contain filters, note editing, score help, viewing categories and secondary metadata. They support bottom safe areas, keyboard avoidance, dismiss/close actions and Reduced Motion. Discover keeps its searchable poster grid and separates personalized picks from Browse. Watchlist has one options button per tile; priority/removal controls appear on request. Rankings collapse pending titles, show score help on tap and retain placement highlighting. Comparison preserves same-format eligibility, hidden scores, distinct skip/undecided/similar answers, durable sessions and Finish later. Its secondary actions and Undo are compact; irrelevant collection receipts do not appear there. Logging/drafts and automatic durable sentiment-to-placement behavior are unchanged.

Detail leads with artwork, concise metadata, an actual score when available, Log/Edit and compact Save. Unwatched titles have no empty numeric-score panel. Notes, collection membership, full overview, cast, metadata and rental/purchase options open intentionally. Streaming stays at company level, with attribution and uncertainty intact. Tonight defaults to up to three poster-led picks, a filter summary and contextual options rather than expanded controls. Company service selections retain exact listing IDs; selecting a company groups its reported tiers/channels and never verifies plan entitlements.

Private collections support create, rename, multiple memberships and deletion with durable conflict-checked Undo. Collection browsing includes watched or unsaved members without manufacturing watchlist or watch events. New collection rows default away safely in older libraries, persist as independent transactional records and retain referenced catalog entries, including deleted memberships referenced by Undo. Existing watch/notes/ranking state is preserved. Local exports include collections.

The private journal searches titles, dates, historical watch notes and current title notes; note-only titles are explicitly not watched. Month groups use actual watched-on dates, with a separate undated group. Optional yearly recaps count dated movie/TV log events, include explicit rewatches, exclude undated watches, and show current ranked favorites among that year's titles. TV logs are not episode/season completion counts. No inferred viewing hours or numeric taste claims.

## Actual verification

- pnpm check: lint, strict root/workspace TypeScript and **77 tests across 10 files passed**. New tests cover multi-collection membership, validation/duplicate names, record round trips and old-library defaults, journal title/note/date semantics, honest recaps, deletion Undo after serialization and conflicting edits.
- Real Node SQLite with the injected native adapter: interrupted collection writes roll back; retry and adapter restart preserve memberships. This is not a physical-device crash test.
- pnpm edge:bundle regenerated the shared domain bundle. iOS Hermes and web production exports passed. No native dependency or lockfile changes; SDK upgrades were not part of this increment.
- In-app browser at default desktop and 390×844: four tabs, collection create/add/filter/reload, deletion and Undo, journal title/private-note search, note save/clear without a watch, recap with undated exclusions, pending placement/Finish later, score help, and simplified Tonight states were exercised. QA collection was removed with Undo available and the QA title note was cleared; no watch or sentiment was added by these checks.
- Native dedicated Seen Comparison Preview simulator: Home and Watchlist captured through simctl; Xcode Device Hub inspected Discover/filter sheet, Rankings, detail, company-level availability, note editor and same-format comparison. Native AX review showed the modal excludes underlying content. Accessibility-large text inspection confirmed the detail remains scrollable and comparison posters stack; original large text size was restored.
- simctl's scripted screenshot batch timed out after writing Discover; Device Hub provided the remaining direct visual inspection. No complete multi-device screenshot matrix, physical-device VoiceOver run, small-iPhone native test, keyboard/crash/restart matrix, production authentication or hosted sync is claimed.
- Native Home and Watchlist snapshots are in docs/screenshots/cleanup. The Watchlist capture contains a transient development-refresh banner. No measured task-time improvement is claimed; source review established redundant Tonight entry points and repeated per-tile controls before consolidation.

## Remaining gates

Artwork-based share cards remain deferred until supplier reuse/attribution rights are confirmed. Shared social lists need accounts, consent and access controls. Collections/journal remain private to this installation; production schemas, actor authorization, RLS, server-owned ranking and sync follow the existing sequential backlog and owner Supabase setup. No GitHub push, deployment or Apple submission was performed.

## Review verdict

The cleanup preserves the approved visual identity and core ranking semantics, puts artwork before supporting copy, consolidates navigation and hides management controls behind accessible actions. The documented native/device limitations remain release checks, not claimed completed work. PRODUCT.md, DESIGN.md, spec, backlog and the approved plan record the implemented increment.
