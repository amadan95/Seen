# Seen UI cleanup and feature plan

Proposed October 7, 2026; implemented locally October 8, 2026 after the user approved implementation. See docs/handoffs/ui-cleanup-and-journal.md.

## Direction

Make Seen feel like a personal film collection: artwork first, a clear next action, details when requested. Preserve the approved Festival Programme palette and typography and Home's approved feature/rail composition. This is a simplification of that direction, not a new visual theme.

Audience: weekly movie/TV viewers opening Seen to choose something, record a watch, or revisit their taste. Success means finding a title, logging it, saving it, or resuming a comparison without interpreting a page of explanatory text.

Evidence: current route/component source and existing design/handoffs, not a fresh live UI audit. Tonight's three-pick flow, exact service/runtime constraints, private notes, recommendation dismissals, persisted comparison sessions and targeted ranking placement already exist. This plan improves their presentation rather than treating them as new features.

## Proposed navigation

Recommend four tabs: Home, Discover, Rankings, Watchlist. Profile and journal are reachable from the existing header profile button; Settings remains inside that area. Preserve routes and saved data. The four-tab choice was adopted when the user approved implementation; five tabs can remain with the same screen cleanup.

Each destination has one primary job. Home helps decide what to watch. Discover finds titles. Rankings revisits personal preference. Watchlist manages future watches. Profile/journal holds memories and account/settings information.

## Screen plan

| Surface         | Default content                                                                                                          | Move behind an intentional interaction                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home            | One feature with title and a short grounded reason; one Tonight poster rail; one pending-ranking prompt only when needed | Recent history into journal; general movie/TV refinement into Rankings; redundant View title/three-picks/header-arrow actions consolidated                                               |
| Discover/search | Search field, Movies/TV choice, clean poster grid                                                                        | One filter sheet for genre, runtime and other supported filters; recommendation explanation on detail or info action; keep browse distinct from personalized recommendations             |
| Rankings        | Movies/TV switch, poster/title/position/score rows, one Refine action                                                    | Filter sheet, score explanation on score tap, one collapsible pending-placement section; retain honest provisional/unplaced states                                                       |
| Watchlist       | Posters, titles and clear saved state                                                                                    | Remove/priority/sort actions in a sheet or row menu, accessible without long press; no priority controls repeated under every poster; no poster ribbons                                  |
| Title detail    | Artwork, title, year/runtime, concise personal score, one primary Log/Edit action and a compact Save/Saved action        | Note editor, full synopsis, cast, metadata and viewing details; preview an existing note without opening a full editor                                                                   |
| Viewing options | One company logo/name per service; Stream first                                                                          | Rent/Buy and source details on expansion or sheet; keep region/source attribution visible and unavailable/cached states honest; apply company grouping to Tonight's service selector too |
| Logging         | Artwork/title, Liked/Fine/Disliked, necessary TV eligibility/status                                                      | Date, historical watch, rewatch and note in one optional Details area; keep drafts, save feedback and Undo                                                                               |
| Comparison      | Two large posters, one question, About the same, visible Finish later                                                    | Skip/Can't decide/Undo in one compact secondary area with accessible actions; reduce repeated saving/score-hidden instructions; preserve distinct answer semantics                       |
| Tonight         | Time/format summary and up to three artwork-led choices                                                                  | Service/filter sheet and a per-title options menu for Not tonight/Not interested/Already seen; preserve their different persistence and undo behavior                                    |
| Profile/journal | Recent watch memories, separate movie/TV favorites                                                                       | Settings, exports, technical preview status, hidden-title management and later retrospective views                                                                                       |

Keep an honest local-only indicator in the profile/settings area and a compact initial disclosure. Replace repeated explanatory blocks with contextual help; do not hide save failures, data uncertainty or supplier credits.

## Delivery order

### 1. Consolidate controls and hierarchy

Inventory each visible control and map it to one task. Define reusable poster tiles, compact action rows, option/filter sheets, status notices and note previews. Remove duplicated navigation/actions on Home first, then repeated card controls in Watchlist and Tonight. Preserve routes, library storage, drafts and durable Undo.

Deliver a reviewed screen map plus representative Home/detail/comparison layouts before implementing the shared pattern across the app. The existing cinematic direction is the reference. Do not shrink typography to force more content onto the screen.

### 2. Apply the cleanup across the core loop

Refine detail, discovery, ranking and logging using the shared patterns. Unify company grouping in viewing options and selected-service controls while preserving the underlying provider IDs and exact availability matching. A grouped company choice must resolve to its actual offer variants; grouping must not invent an entitlement or lose an existing selected tier.

Retain automatic comparisons after a durably saved sentiment. Placement continues until a score exists or no useful pair remains; Finish later remains available and resumable. Movies compare only with movies, TV only with TV, and TV confirmation stays explicit. Filters must never refit rankings. Notes remain private and note edits must not change scores or create watches.

### 3. Verify before adding features

One batched native review covering every main screen, then one correction/confirmation pass. Check small and standard iPhones, large Dynamic Type, long titles, absent artwork, empty/new libraries, large libraries, unknown dates/runtime, unavailable/stale offers and failed writes. Confirm 44-point touch targets, VoiceOver labels/order, contrast, reduced motion and keyboard handling. No essential action may rely only on swiping or long pressing.

Run pnpm check and relevant existing interaction/storage tests, regenerate the Edge bundle only if domain code changes, and check native dependency compatibility if any dependencies change. Validate search → detail → save/log → same-format comparison → ranking and note edit/reload/clear. Record what was actually verified in a handoff.

Acceptance: no duplicate action for the same destination within a content section; film art precedes supporting copy; default poster cards contain no paragraphs or expanded management controls; secondary information remains reachable; existing saved data and semantics survive the cleanup. Establish task-time/tap baselines before implementation rather than claiming unmeasured improvements.

## New feature ideas, ranked

| Priority | Idea                                                                   | User value                                                          | UI location and delivery constraints                                                                                                                                                                                 |
| -------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Small personal collections: Rainy night, With friends, Rewatch someday | Turns the watchlist into something useful for a particular occasion | Optional collections sheet inside Watchlist, not another tab; a title can belong to multiple collections; initial local implementation, future owner-only sync                                                       |
| 2        | Searchable viewing journal                                             | Makes dates and existing private notes useful months later          | Profile/journal search and compact month groups; search notes locally, preserve undated watches and per-watch vs title-note semantics; no note upload or social exposure                                             |
| 3        | Share a film card or Top 5 poster collage                              | Lets users express their taste without a social feed                | Explicit Share action on detail/rankings using the native share sheet; notes excluded by default; show only actual rated titles and honest score state; verify image supplier reuse/attribution rights before export |
| 4        | Monthly or yearly personal recap                                       | Gives the collection emotional value                                | Optional journal entry with favorite posters and counts of actually logged events; separate TV/movie views, explain rewatches and incomplete dates; no fabricated viewing hours or streak pressure                   |
| Later    | Plan a watch together                                                  | Helps two people choose from their lists                            | First build reliable account sync, consent and access controls; then invite-based shared shortlist, not a general feed; no automatic exposure of notes/history                                                       |

Build collections first after cleanup, followed by journal search. Try share cards only after rights and export behavior are confirmed. Recaps can reuse the journal. Tonight is already implemented; improve its visibility instead of building a second decision tool.

## Keep out of this increment

No new tabs for features, episode tracker, badges/streaks, public feed, numeric taste-match claims, AI chat, speculative streaming expiry alerts or wholesale theme replacement. Reliable private account backup/sync remains an important production foundation but must follow the existing schema/auth/RLS/server-authoritative backlog and owner Supabase setup; a UI refresh does not complete those gates.

## Open choices

- Four-tab navigation adopted with the approved implementation; Profile remains reachable from Home.
- Which first feature follows cleanup: recommended collections; journal search is the alternate if remembering past watches matters more than choosing future ones.
- Cleanup, four-tab navigation, collections, journal search and yearly recaps are implemented locally. Artwork export and social lists remain deferred under the stated gates.
