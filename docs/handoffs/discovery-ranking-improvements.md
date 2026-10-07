# Discovery, ranking and recovery refinement

Implemented October 6, 2026 against the approved discovery/ranking plan. This is an
increment to the local preview, with production requirements incorporated into
spec X and the existing backlog. It does **not** complete tasks 03–22 or replace
actor authorization, RLS, server-owned sessions/snapshots or the production outbox.

## Delivered

- Home opens Tonight: up to three unseen movie/TV picks, explicit movie time budget,
  watchlist-only and exact US subscription constraints. Fewer valid results remain
  fewer results. Unknown runtime and stale/unknown offers fail hard constraints.
  Service freshness is rechecked while Tonight remains open.
- Versioned `content-preview-v2` recommendations reorder the bounded cached catalog
  using current positive/negative sentiments, bounded supported ranking evidence,
  genre and capped creator/cast contributions, diversification and exploration.
  Reasons cite actual seeds or disclose catalog discovery. No invented match scores,
  availability, popularity, related-title edges or friend signals.
- Not tonight/shuffle affect only the visit. Not interested is durable and reversible
  through Undo or paged hidden-title restoration. Already seen opens historical
  logging with an unknown date. Search and ordinary Browse remain independent of
  seen/dismissed recommendation exclusions. Home, Discover and Tonight carry source
  request/item references through detail/save/log; historical logs and rewatches
  do not get recommendation first-watch attribution.
- Format-specific ranking input cache fits outside rendering and excludes unrelated
  metadata/notes/filters. Failed fits keep the last usable confirmed ranking with a
  retry state; removed/ineligible/uncompared titles cannot retain an old score.
  The Bradley–Terry objective and fixed display-scale version are unchanged.
- `adaptive-preview-v2` picker uses unrounded latent scores, bounded nearby/quantile/
  disconnected candidates, ambiguity/coverage/Top-10 priorities and fifth-question
  bridging. The format-scoped served counter survives short refinement sessions and
  reloads. Presentation sides are seeded; stored evidence is canonical. Offered pairs,
  skips and revision-scoped 24-hour cooldowns survive navigation/restart.
- General refinement retains three questions. Placement has no three-question cap,
  resumes correctly from unplaced rows, and retains explicit TV seen-enough checks.
  A scored answer reveals the title among ranking neighbors with a short highlight.
  Durable mutation-specific Undo survives navigation and refuses intervening edits.
  Logging drafts preserve unfinished details independently of accepted watches.
- Native preview storage uses transactional metadata/per-record writes and an atomic
  legacy JSON migration. Migration removes the legacy copy only in the committing
  transaction. Failed writes cannot advance acknowledged state. Web remains localStorage.
- Startup prioritizes stale saved/recent/watchlist titles, caps saved-title refresh at
  eight and batches updates. Runtime filtering requests basic movie detail without
  credits/videos/providers. Pagination retries its failed page. History and unplaced
  rankings are virtualized; watchlist filters are disclosed, can be cleared, and
  priority choices are explicit. Home/Profile give TV its own ranking/favorites.

## Files

Domain: `ranking.ts`, `library.ts`, new `recommendations.ts`, `recovery.ts`, `sessions.ts`
and improvement tests. Contracts: backward-compatible library fields, source references,
Undo/draft/session/cooldown records and new `preview-records.ts` encoder/differ.
Native: `LibraryProvider`, `storage.ts`, injected `recordStorage.ts`, SQLite fault tests.
UI: Home, Discover, Rank, Watchlist, Profile, Compare, Log, detail, PosterTile,
new Tonight and shared UndoActions. Catalog: runtime-only requests and search release
metadata, with a contract test. Generated Edge bundle was rebuilt from shared domain.
Spec/backlog/design record the adopted semantics and remaining sequence.

## Actual verification

- `pnpm check`: lint, strict root/workspace TypeScript, **68 tests across 8 files passed**.
  Includes targeted Undo conflicts, cache invariance/failure/reset, constraints/reasons,
  attribution, canonical presentation, placement/refinement/cooldown persistence and
  bridge scheduling across session reloads.
- Real in-memory SQLite via Node's SQLite engine and an injected platform adapter:
  failed migration retains legacy records; failed mutations roll back; retry succeeds;
  note edit writes one changed record; reset clears records. This does not substitute
  for Expo SQLite crash/restart behavior on an iPhone.
- Expo exports: iOS Hermes bundle and web bundle passed. These are JavaScript bundle
  checks, not a signed/native binary build. No native dependencies or lockfile changed.
- `pnpm edge:bundle`: passed; generated bundle was not manually edited. Deno is not
  installed on this host, so the existing Deno smoke was not rerun locally; CI owns it.
- `pnpm benchmark`: 2,000 titles / 10,000 pairs, **26.0 ms**, 32 iterations, converged,
  gradient norm 0.000005673583762799694 on this Mac. This is not an Edge/device latency claim.
- In-app browser at 390×844 plus default desktop viewport: Tonight, 90-minute hard
  filter (one 87-minute result), recommendation dismissal/Undo across navigation,
  historical logging, saved-watch Undo on comparison and Rank, Finish later/resume
  placement, scored placement among neighbors and comparison Undo all exercised with
  sample data. Screenshots: [Tonight](../screenshots/tonight-mobile.jpg),
  [placement](../screenshots/placement-result.jpg). The isolated test-origin sample
  library includes one extra historical Fox watch; no account or production data changed.
- Local catalog bridge was not running during UI checks; its honest partial-refresh
  error was visible on Home. Live vendor freshness/service filters were covered with
  synthetic responses, not revalidated against a hosted catalog.
- An Expo/pnpm launch attempted dependency reinstall under restricted network access;
  the exact frozen dependencies were restored offline from the existing pnpm cache.
  No dependency version, credentials, deployment or paid service was added.

## Remaining gates and follow-on work

Continue task 03 authentication and outstanding foundation checks, then 04–09 catalog,
atomic actor-scoped commands, recoverable drafts and account-partitioned cache/outbox.
The preview SQLite database is one local installation, not account-scoped sync or
server mutation receipts. Native Apple/email auth, RLS integration and real-device
interruption/VoiceOver/Dynamic Type checks were not performed in this increment.

Tasks 10–12 still require authorized online sessions, source-revision guarded server
jobs, atomic published snapshots and service integration. Local sessions/cache are
reference behavior; client scores must not become production authority. Placement
bracket rebuilding/reconsideration service semantics remain production work.

Tasks 13–17 add catalog-backed retrieval from liked seeds/related titles, full H1
available-feature weights, franchise identities/caps, onboarding, licensed regional
availability, persisted recommendation service records, consented visible impressions
and server-derived attribution/evaluation. The preview scores a bounded cached pool;
it does not implement these production candidate services or an evaluation harness.
Measure time to useful watch choice, attributed first watches, post-watch enjoyment,
ranking satisfaction, comparison burden and latency using temporal data splits.

Tasks 18–22 retain social authorization, privacy/moderation and release gates. Monthly
programmes and mini-festivals are adopted post-release work, not built early; unknown
dates remain outside monthly totals and mini-festivals extend task 23. Collaborative
and semantic algorithms retain permitted-data/vendor-rights/consent gates. No paid
infrastructure, deployment or Apple submission was performed.
