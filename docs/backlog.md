# Seen — coding-agent execution backlog

Version 1.1 · Rank Score added · October 4, 2026. Companion to the [full iOS specification](spec.md).

Run one task at a time unless accepted interfaces and file ownership make parallel work safe. Tasks 01–22 are the initial public release; 23–28 are later increments. Section references such as G or K refer to the full specification. These are production increments. A local fixture preview and identity foundation exist; consult handoffs for actual checks and remaining gates.

## Instructions to prepend to every task

> Read the Seen specification sections named below, repository AGENTS.md, current migrations, contracts and prior task handoffs. Inspect before editing. Implement only this increment and reuse working code. Keep TypeScript strict; use explicit request/response validation. Preserve ranking, visibility, idempotency and offline semantics. Never expose server credentials or use an unrestricted service-role client to bypass caller authorization. Add only relevant automated tests and run the task's required checks. Finish with files changed, tests actually run, acceptance criteria met, known limitations and follow-on dependencies. If a real contradiction prevents implementation, explain the exact conflict and propose the smallest spec change; do not silently invent product behavior.

## 01. Establish the foundation and decisions

**Dependencies:** none. **Read:** overview, J, Q, S, V.

**Prompt:** Create the pnpm workspace, `apps/ios`, shared contracts/domain packages, Supabase local configuration, docs/decisions and CI. Choose mutually compatible stable Expo/React Native/TypeScript versions, record them and pin the lockfile. Establish the iOS runtime target separately from Apple's current submission SDK. Build a minimal five-tab native shell using the design direction in O, with functional navigation rather than feature placeholders. Define the error/cursor/mutation-envelope contracts. Prove shared pure TypeScript imports can be deployed in the Edge runtime. Record vendor rights/access as explicit launch gates; do not assert permission or purchase services.

**Acceptance:** development build runs on a physical iPhone; local database reset and CI checks work; staging/production configurations are isolated; no embedded secrets; decision record lists unresolved vendor approvals without blocking fixture-based development.

**Verify:** lint/typecheck, workspace unit smoke, native build, local migration reset, deployed staging Edge import smoke. Document checks needing owner accounts.

## 02. Implement identity, settings and security primitives

**Dependencies:** 01. **Read:** K1–K2, M, L1.

**Prompt:** Add profiles/user_settings, preference state and initial account-state schema. Implement username uniqueness/validation, profile bootstrap and owner-only settings reads/writes. Add explicit grants/RLS, authenticated actor helpers, permission contracts and synthetic owner/stranger fixtures. Keep privacy defaults private. Do not add social projections or future tables yet.

**Acceptance:** identity/profile creation is retry-safe; username capitalization cannot bypass uniqueness; another user/anonymous role cannot read settings or private raw profile data; account_state gates writes; no client-editable staff privileges.

**Verify:** migration reset, constraints, pgTAP grant/RLS tests and bootstrap retry integration test.

## 03. Add native authentication and resumable setup shell

**Dependencies:** 02. **Read:** D1, F1, M1, P1.

**Prompt:** Implement native Apple sign-in and email OTP with secure session persistence and explicit linking policy. Include the backend authorization-code exchange/encrypted provider-credential storage needed for later Apple token revocation; do not assume ID-token login provides that credential. Build Welcome/Browse/Auth/Username screens and resumable onboarding checkpoints. Allow browsing without account; prompt authentication when saving. Do not implement taste selection until catalog/logging/ranking exist.

**Acceptance:** fresh/returning login works, cancellation/expired code is recoverable, logout clears account-scoped state, private relay/name handling is correct, credentials are absent from logs.

**Verify:** mocked auth failures and session lifecycle tests; real-device Apple auth, email code and restart flow; record configuration limitations honestly.

## 04. Build the catalog schema, adapter and cache

**Dependencies:** 01–02. **Read:** F2–F3, K3, L3–L4.

**Prompt:** Add stable media identities, external mappings, licensed metadata/subtypes, genres/people/credits/videos/companies. Implement TMDB adapter and authenticated bounded catalog/search/detail services with caching, single-flight deduplication, expiry/legal-expiry handling and source diagnostics. Use synthetic vendor responses for CI. Do not import the entire TMDB catalog or assume AI-processing rights.

**Acceptance:** same numeric movie/TV supplier IDs map to distinct correct identities; repeated hydration is idempotent; nullable metadata renders valid contracts; 429/error behavior preserves last usable data; keys stay server-side; attribution data is available.

**Verify:** collision/idempotency/expiry/upstream contract fixtures; migration/index checks; staging vendor smoke only with approved credentials.

## 05. Implement search, detail and person screens

**Dependencies:** 03–04. **Read:** E, O, P3–P4.

**Prompt:** Build reusable poster/media rows, search with cancellation/debounce and format/person tabs, genre/year filters, detail and person credits. Wire official trailer/source links. Use stable loading/empty/error layouts and cached metadata. Personal save/log actions can route into forthcoming features via existing navigation contracts, but do not fake saved state.

**Acceptance:** superseded responses cannot overwrite a new query; remakes and formats are distinguishable; missing images/runtime are handled; metadata/attribution and TV episode-duration labels are truthful; VoiceOver labels exist.

**Verify:** component tests for stale search/empty/error states, title-navigation E2E, real-device layout/large-text/link check.

## 06. Implement atomic logging and current-opinion commands

**Dependencies:** 02, 04. **Read:** F4, G2/G5, K4, L2, J3.

**Prompt:** Create user_media/watch_logs, mutation receipts and transactional log/edit/remove-history/opinion services. Distinguish event history, current sentiment and opinion revision. Support unknown/day/year dates, rewatches, TV statuses and explicit seen-enough eligibility. Implement actor-scoped idempotency and version checks. Define undo/remove behavior without deleting unrelated events. Build reusable authorization checks; no derived score writes from clients.

**Acceptance:** retry creates one watch; rewatch is explicit; stale sentiment cannot overwrite current opinion; TV dropped is not automatic dislike; note/date edits leave opinion revision unchanged; unknown historical date stays unknown; final-history removal clears eligibility.

**Verify:** atomic failure/rollback, duplicate-payload mismatch, two-device conflict, date/status constraints and owner/stranger RLS tests.

## 07. Build logging UI and personal library

**Dependencies:** 05–06. **Read:** D2–D3, F4, O, P5/P9.

**Prompt:** Implement the fast sentiment sheet, optional details, TV status/eligibility controls, edit latest log vs explicit rewatch, save/undo feedback and paginated owner library. Save before automatically opening targeted placement for each sentiment choice. Wire current personal sentiment/status into detail and own profile. Private notes never appear in social-ready DTOs.

**Acceptance:** default movie flow needs one tap to open and one sentiment tap to save; dismissal/comparison skip cannot undo a successful log; visible pending/error states; date and rewatch affordances are distinct; cached user state is invalidated correctly.

**Verify:** component save/edit/conflict tests, log/rewatch/remove E2E, usability timing on device and large-text/VoiceOver sheet check.

## 08. Implement one watchlist end to end

**Dependencies:** 05–07. **Read:** F7, K4, L2, P8.

**Prompt:** Add revisioned watchlist items including absent-state tombstones. Implement desired-state present/priority commands and paginated sort/filter APIs, then Watchlist screen and save toggles. Carry originating recommendation reference when provided. Integrate watched-movie/started-TV removal into log transaction with undo semantics; permit intentional manual re-add.

**Acceptance:** duplicate save is one membership; same target add/remove conflicts resolve deterministically; priority and stable sorts work; UI save state matches authoritative membership; unknown duration does not pass a hard runtime filter.

**Verify:** desired-state/idempotency/tombstone/transaction tests, sort/filter integration, save/remove/log-removes-watchlist E2E.

## 09. Add durable offline cache and outbox

**Dependencies:** 06–08. **Read:** D8, J3, R.

**Prompt:** Implement user-partitioned SQLite cache/outbox, persist-before-feedback, operation hashes/revisions, dependency serialization, retry/backoff and conflict resolution. Support cached owner browsing, offline watch events and watchlist desired state. Keep comparisons/privacy/social online. Define 30-day replay/90-day receipt behavior and account-switch cleanup. Server receipts must commit with mutations.

**Acceptance:** killed app and duplicate delivery produce one effect; unsent changes survive restart; stale edits show Needs attention; signing into another account cannot replay old commands; sync does not depend on background execution; privacy controls do not claim offline success.

**Verify:** crash before send/after commit, clock skew, expired replay, account switch, dependency failure and two-device conflicts; physical-device airplane-mode exercise.

## 10. Implement the ranking domain module

**Dependencies:** 06; 01 runtime portability proven. **Read:** G1–G5, R.

**Prompt:** Implement pure deterministic regularized Bradley–Terry objective/gradient/solver, versioned constants, active-evidence filtering, evidence labels and bounded comparison picker. Implement G5a's fixed logistic 0–10 Rank Score transform, one-decimal output and score-scale version; unplaced items have null score. Include insertion-inspired short-session behavior and component bridging. No database/network/UI inside this package. Preserve soft-similar versus undecided/skip distinctions.

**Acceptance:** reproducible finite converged fits; no rank or Rank Score for unplaced titles; score bounded/monotonic/versioned and independent of filter/library percentile; rounded-equal scores still sort by latent value; cycles/disconnected evidence supported; Fine can outrank Liked with evidence; repeated rewatches add no evidence; picker ends when exhausted and excludes invalid pairs.

**Verify:** all G fixtures, numerical gradient/solver checks where useful, deterministic ordering and 2,000-title/10,000-pair benchmark. Report measured cost rather than assuming Edge capacity.

## 11. Implement ranking persistence, sessions and jobs

**Dependencies:** 06, 10. **Read:** G6, K4–K5, L2/L4.

**Prompt:** Add scope state, offered sessions, immutable comparison events, current preferences, snapshots/items and coalesced durable jobs. Persist internal latent_score separately from nullable numeric(3,1) rank_score and snapshot score_scale_version. Build session/answer/undo/read services with actor checks, endpoint opinion revisions and pair revisions. Publish complete snapshots atomically using source-revision checks; authorized DTOs include display Rank Score but never raw latent values. Choose a worker runtime compatible with task 10's measured CPU budget.

**Acceptance:** duplicate vote counts once; stale session/opinion fails explicitly; skipped reconsideration preserves earlier answer; reset invalidates touching pairs only; old worker cannot replace new snapshot; raw internals remain owner-only via safe services.

**Verify:** concurrent scope/pair updates, stale worker, failed-fit retry, snapshot atomicity, undo conflict and RLS integration; runtime benchmark in staging.

## 12. Build Rank and comparison screens

**Dependencies:** 07, 11. **Read:** D5, G, P6.

**Prompt:** Add Movies/TV rank views, Top limits, genre/release-year filters, Unplaced section and comparison session UI. Show left ordinal and right-aligned one-decimal Rank Score with column legend; add Your score /10, position and Provisional status to media detail and profile previews. Unplaced displays an em dash/Not yet scored. Hide scores during head-to-head questions; show only confirmed resulting snapshot scores. All answers have accessible buttons; Finish later is available. Sentiment completion automatically opens targeted placement; skips continue without the general refinement cap until a score is assigned. Prefer already ranked titles sharing genres, then nearby personal scores. Show pending snapshot/evidence status, conflict refresh and valid undo. Do not expose latent scores or precise confidence percentages.

**Acceptance:** max-three default is escapable after every answer; question uses seen titles of same format; current list/score comes from one complete server snapshot; assigned numbers agree across surfaces and stay unchanged by filters; no sentiment-only fabricated score; no score shown inside comparisons; large text can stack comparisons and read the score column.

**Verify:** component state/one-decimal score/rounding-collision tests, cross-surface score consistency, log→compare→undo E2E, skip/no-pair/stale-opinion flows and VoiceOver/Reduce Motion exercise.

## 13. Finish progressive taste onboarding

**Dependencies:** 03, 05–07, 12. **Read:** D1, F1, P1.

**Prompt:** Connect the setup shell to optional liked historical selections, secondary Fine/Disliked selection, genres and up to three comparisons. Resume from checkpoints and suppress public activity for seed batches. Provider step stays capability-gated until task 14. Show initial provisional/unplaced results and let users reach Home with zero selections.

**Acceptance:** no compulsory dislikes/quota; unknown historical date preserved; skipped ranking still leaves logs saved; one-format seed never creates cross-format questions; restart resumes without duplicate seeds.

**Verify:** zero/one/multiple seed E2E, interrupted setup, duplicate taps and onboarding batch/activity suppression tests.

## 14. Add regional provider availability

**Dependencies:** 04–05, 08. **Read:** F8, K3, L3–L4, P4/P7/P8.

**Prompt:** Implement source-namespaced provider catalog, user subscriptions, complete availability snapshots/offers and adapter capabilities. Integrate country selector, offer groups, freshness/attribution and supplied TMDB watch-page links. Add same-country selected-service filtering. Hard gates must disable unsupported deep links/start/end dates. Do not infer provider entitlement or leaving-soon data.

**Acceptance:** rent/buy do not count as subscription matches; region/provider namespace correct; stale/unknown/error distinct; partial fetch cannot replace a complete snapshot; parent service does not automatically include add-on channels.

**Verify:** region/offer/staleness/empty/error fixtures, refresh atomicity, selected-services filter and real-device source-link smoke with approved API access.

## 15. Implement V1 recommendation services

**Dependencies:** 04, 06, 11, 14. **Read:** H1, K5, L2, N3.

**Prompt:** Build bounded candidate generators, strict filters, versioned feature scoring and diversity re-ranking. Implement request/item records with truthful reasons and taste/provider revision cache keys. Begin with own taste/catalog sources; visible-friend generator remains gated until task 18. No LLM, vectors, training service or predicted probability.

**Acceptance:** excludes watched/dismissed items; hard runtime/service/region filters pass only known valid metadata; sparse users get labeled cold-start picks; duplicate source candidates collapse; output/debug traces reproduce by request seed/version.

**Verify:** cold-start/missing-feature/dislike/filter/diversity tests, cache invalidation and bounded-upstream budget tests.

## 16. Build Home and Discover

**Dependencies:** 12–15. **Read:** E, O, P2/P7.

**Prompt:** Wire personalized modules, Continue ranking, Recently watched, Watch tonight and Discover filters to accepted services. Keep initial rails limited and handle partial failures per module. Provide See all pages, virtualized lists, resized artwork and editable constraints/no-results alternatives. Social rail waits behind task 19's flag.

**Acceptance:** no fake friend/percentage/streaming-expiry rails; cached content remains usable during refresh; applied filters are visible; empty results never silently loosen constraints; poster actions carry served item IDs.

**Verify:** module/filter component tests, discover→detail→watchlist E2E, cache/performance and small/large-text device layout check.

## 17. Implement analytics and the feedback loop

**Dependencies:** 06, 08, 11, 15–16. **Read:** N, K5.

**Prompt:** Create versioned event schemas, client visibility-based impressions, server mutation events and recommendation attribution. Carry source item from served tile through detail/save/log. Deduplicate and respect optional telemetry choice. Build basic daily activation/retention/quality aggregates without a warehouse. Raw notes/prompts/search text stay out of telemetry.

**Acceptance:** API delivery isn't counted as impression; server derives watched conversions; already-seen/rewatch cases excluded from first-watch rates; one watch isn't double-counted; late/offline events use declared windows; opt-out metrics are clearly scoped.

**Verify:** impression visibility/dedup tests, attribution boundaries/multiple touches/late events and consent/no-sensitive-payload checks; sample aggregate reconciliation.

## 18. Implement social authorization and safe projections

**Dependencies:** 02, 06, 11; 15 for friend recommendations to Discover. **Read:** F9, G6, K5, M2–M3.

**Prompt:** Add follows/requests/blocks and one explicit visibility evaluator. Build safe user search/profile/shared-rank/feed projections and server-generated referenced activity. Recheck current privacy/block rules at read time. Private profile needs approved follower; friends-only content requires mutual accepted follows. Enable only authorized friend recommendation features in V1 scoring.

**Acceptance:** private titles and their Rank Scores never appear in ranks/counts/thumbnails/genre aggregates/reasons; visible ranks are dense after filtering and retain permitted title scores; no opponent/raw latent score/private denominator exposure; block revokes both follows and all projected access; historical batches remain quiet.

**Verify:** owner/stranger/follower/mutual/block/deletion role matrix, rank #2 privacy fixture, public→private invalidation and no cross-viewer cache leakage.

## 19. Build social UI and moderation primitives

**Dependencies:** 18, 05; report/avatar schemas from K. **Read:** F9/F14, P9/P10/P12, M4.

**Prompt:** Implement own/other profiles, follow-request management, visible Top shared titles with assigned Rank Scores, small chronological activity feed and search users. Attribute a friend's number explicitly, such as Sarah's score 8.8, and only show it when ranked and currently permitted. Add report/block UI, bio/username filtering and private avatar processing/signed delivery. Provide published support contact. No reviews, comments, chat or Taste Match percentages.

**Acceptance:** private stub leaks no counts/taste; followers don't edit another profile; block/report accessible; avatar rejected/processing states clear; deleted/private content vanishes on authoritative refresh; required moderation queue data is available to task 21.

**Verify:** profile/follow/block/feed E2E, avatar type/size/access tests and VoiceOver navigation; rerun derived-output permission fixtures.

## 20. Implement privacy settings, export and deletion

**Dependencies:** 03, 09, 18–19. **Read:** F13, M, P13, S2.

**Prompt:** Finish independent account/history/watchlist privacy controls and per-title overrides, provider/region settings, owner data export and in-app recent-auth deletion. Jobs must be resumable and idempotent; revoke Apple tokens where used, sessions, notifications and projections, purge storage/user content, and maintain restore deletion ledger. Exports are private expiring downloads of user data, not bulk supplier catalogs. Resolve unsynced local changes explicitly.

**Acceptance:** changing privacy requires online acknowledgement and immediate new-request enforcement; export excludes others' private data; deleting account restricts access immediately and completes all documented purge checkpoints; sign-in after deletion cannot restore old data.

**Verify:** export content/expiry, deletion retries/fault injection/token revocation and privacy matrix; isolated restore/deletion-ledger rehearsal.

## 21. Build minimal internal operations

**Dependencies:** 04, 11, 17, 19–20. **Read:** F14, K5, S.

**Prompt:** Build a small separate staff console/API with assigned roles, audited access, user status lookup, report queue, catalog/job issues, recommendation reason inspector, feature flags and vendor usage. Add redacted diagnostics and alerts/runbooks for stuck jobs, key incidents and deletion delays. Do not grant a general-purpose browser service-role token or routine private-note access.

**Acceptance:** ordinary user cannot become staff; support/moderator/admin capabilities differ; every privileged change audited; retry respects job dedup/lease; feature gates enforced server-side.

**Verify:** staff authorization/grants, report resolution/job retry integration and log-redaction checks; exercise one outage runbook.

## 22. Complete release hardening and submission package

**Dependencies:** 01–21. **Read:** R, S, T5, U.

**Prompt:** Audit against MVP acceptance, run critical native/database/security/sync suites, benchmark representative data, fix material defects and prepare TestFlight/App Store assets, policies, source attributions, privacy disclosures/manifests, age-rating answers and review access. Confirm licenses and current Apple SDK requirements. Test universal links with a minimal policy/link-fallback web page; do not build a full web app. Record release/rollback procedure and unresolved blockers.

**Acceptance:** actual supported-device flows pass; no known cross-user data leak, stale-ranking overwrite or duplicate offline watch; deletion/report/support complete; load goals measured; server/client flags can safely disable upstream features; public release does not proceed with unresolved rights or review gates.

**Verify:** all critical tests, physical-device Apple auth/airplane-mode/accessibility/deletion, staging-to-production migration rehearsal and isolated backup restore. Submit only when the owner authorizes release; preparing the reviewable build/package is part of this task.

## 23. Add custom lists

**Dependencies:** 22 plus a prioritized post-launch decision. **Read:** F12, K5, P11.

**Prompt:** Add list/item migrations, owner CRUD, version-checked atomic reorder, public/friends/private safe reads, share links and list UI. Reuse catalog/media rows and visibility evaluator. List membership must not leak private watching/sentiment. No collaborative editing/comments.

**Acceptance:** no duplicate media/positions; stale reorder conflict recoverable; share route reauthorizes; private list/owner deletion cleans projections.

**Verify:** reorder transaction/concurrency, visibility/block/link tests and create/add/reorder/share E2E.

## 24. Add direct friend recommendations and inbox

**Dependencies:** 22. **Read:** D7, F11, K5, N3, P12.

**Prompt:** Implement structured referrals to permitted mutual friends, optional moderated short message, recipient responses and canonical inbox. Enforce one open sender/recipient/media referral, daily limits and block checks. Track explicit-save-to-watch attribution within the separate referral window. Do not automatically save/watch on receipt or expose private conversions to sender.

**Acceptance:** recipient controls response; sender controls withdrawal; Not Interested declines referral without silently creating a global dislike; blocked/unauthorized sender cannot deliver; permitted conversions show only with consent/current visibility.

**Verify:** permissions/status/idempotency/rate-limit tests, private conversion fixtures and send→save→log E2E.

## 25. Add preference-controlled notifications

**Dependencies:** 24, 20. **Read:** F11, K5, P12/P13, S.

**Prompt:** Add preferences/device tokens/notifications/deliveries, contextual iOS permission request and Expo/APNs delivery with receipts/retries. Start referrals and follows; leave unavailable source-driven alerts disabled. Inbox is authoritative; generic lock-screen text by default. Reauthorize before send/open, respect quiet hours and clear tokens on logout/deletion.

**Acceptance:** denied push does not block inbox; duplicate jobs don't send twice; bad tokens retire; privacy/block changes suppress queued content; no provider-expiry claims without source support.

**Verify:** notification preference/quiet-time/dedup/revocation tests and physical-device APNs permission/delivery/open exercise.

## 26. Evaluate and add Taste Match/V2 candidates

**Dependencies:** 22, 17–18 and sufficient real permitted overlap. **Read:** F10, H2, N3.

**Prompt:** Implement versioned visibility-safe overlap and shrinkage-weighted similarity, qualitative UI with support labels, item-item/neighbor candidate generation and evaluation harness. Suppress numeric index below the support threshold. Honor collaborative opt-in, privacy revisions and blocks. Roll out only after temporal evaluation and product guardrails justify it.

**Acceptance:** tiny overlap is unknown, not dissimilar; similarity index isn't enjoyment probability; private titles/denominators never leak; sparse users retain V1 fallback; measured quality/coverage report accompanies rollout.

**Verify:** controlled similarity fixtures, privacy revisions, temporal-leakage tests and shadow/user-level experiment reconciliation.

## 27. Add licensed mood discovery and semantic retrieval

**Dependencies:** 22, explicit supplier AI-processing rights, owner-approved provider/config/budget and user consent. **Read:** I, H3, K5.

**Prompt:** Add strict mood-intent parsing, server-only model adapter, title disambiguation, allowlisted filter execution, cost quotas/kill switch and deterministic fallback. If permitted, add versioned content embeddings/tags with provenance/input hashes/legal expiry and pgvector retrieval. Reuse existing recommendation/filter UI; no chatbot or model-generated availability facts.

**Acceptance:** runtime/region filters remain deterministic; ambiguous TV commitment prompts clarification; unknown references can't invent IDs; failures/refusals have usable fallback; no private notes sent by default; vectors purge on rights expiry; quotas cap cost.

**Verify:** fixed prompt/adversarial/ambiguity/hard-filter suite, consent/redaction tests, embedding-version compatibility, semantic recall and latency/cost evaluation. No live external model calls in ordinary CI.

## 28. Add richer licensed availability only when justified

**Dependencies:** 22, licensed vendor contract and verified capabilities. **Read:** F8/F11, L3–L4, V.

**Prompt:** Implement a second availability adapter without replacing stable media IDs or user state. Add contract-supported provider/native links with HTTPS fallback, source mappings and reliable availability dates. Enable newly detected/expiry alerts only for supported provenance; distinguish Seen observation time from actual service start date. Validate TV season scope and plan/add-on coverage.

**Acceptance:** adapter replacement preserves history; legal data expiry/termination purge works; native links are supplied/validated, not guessed; errors/partial imports never create false removal alerts; unsupported dates remain hidden.

**Verify:** vendor fixtures/credit budgets, mapping migration, link fallback, snapshot-diff/date provenance, entitlement labeling and notification dedup/privacy tests.

Season/episode tracking, cross-format overall rankings, Android and full web remain separate future specifications. Their identity/permission contracts must be designed before adding client screens or changing V1 ranking scopes.

## Adopted discovery/ranking refinement

The October 6 refinement in [spec X](spec.md#x-discovery-and-ranking-improvements--october-6-2026)
and [implementation handoff](handoffs/discovery-ranking-improvements.md) supplements
these increments; it does not mark them complete or reorder dependencies.

- **03–09:** resumable authentication; durable actor-scoped commands/outbox; recoverable
  drafts and mutation-specific Undo; transactional incremental records.
- **10–12:** format-specific ranking-input cache; failed/stale-fit protection; adaptive
  bounded picker, seeded sides, bridge scheduling and persisted cooldowns; authoritative
  sessions; correct placement resume, durable Undo and highlighted ranking result.
- **13–17:** personal onboarding, licensed availability, versioned ordered recommendations,
  Tonight's three picks, temporary/persistent/logging feedback and grounded attribution.
  Optimize pagination retries and expose active watchlist constraints/explicit priorities.
  Measure user value and comparison burden, with temporal offline evaluation.
- **18–22:** only authorized social features, native/accessibility/performance checks and
  release gates. Preview screenshots and exports do not establish release readiness.
- **After 22:** private monthly programmes require event-date completeness checks;
  unknown dates are excluded from dated totals. Mini-festivals extend task 23 lists
  with editable order and real-watch progress. Tasks 26–28 retain data/rights gates.


## Local UI cleanup increment — October 8, 2026

Four-tab navigation, contextual sheets, quiet secondary controls, company-level service choice, private collections with durable Undo, searchable journal and dated yearly recap are implemented in the isolated local preview. This does not complete production auth/data/ranking tasks. Carry collection owner authorization, server validation, schema migration, sync/conflict contracts and private-note protections into the existing sequential backlog before a hosted launch. Artwork export/sharing stays deferred until supplier reuse rights are confirmed; shared lists require permitted accounts and consent. See docs/handoffs/ui-cleanup-and-journal.md for actual verification.
