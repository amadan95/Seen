# Festival Programme redesign — October 5, 2026

User approved option B for every screen, with option A’s Home composition translated into B’s palette and typography. The cinematic gallery under the local visualizations directory is the reference; its example scores, counts and offers are not product data.

## Implementation

Plum surfaces, cream text, warm ivory actions, Georgia editorial headings and media titles, system body and controls, fine rules, small poster corners. Shared tokens propagate through native navigation, sheets, availability, forms and empty/error states. No dependency changes or local-storage migrations.

Home features a real discovery pick, its explanation, a cropped poster, Continue ranking, a poster rail and recent history. Discover/Search use programme rows; detail leads with the title and director/year then portrait and description; logging uses an editorial question and vertical sentiment choices. Comparison keeps real posters, hidden scores, explicit TV eligibility and its existing save/placement flow. Rankings use ordinals and unboxed scores, Watchlist keeps sort/priority/removal, Profile shows actual counts and a top-film rail. Settings preserves export and reset confirmation.

## Verification

- `pnpm check`: lint, strict workspace TypeScript, 37 tests passed.
- Expo iOS Hermes export and web export passed.
- Live iOS simulator Home and targeted movie comparison inspected. Native navigation and tab bars remain system components.
- Impeccable mechanical detector: no findings on changed UI sources.
- Browser screen review covers Home, Discover, Rank, Watchlist, Profile, detail, log, comparison and settings at phone width. No watch or comparison answer was submitted during visual review.

## Limits

This remains the existing local development app with the local TMDB bridge. Hosted identity, remote data and production ranking remain release gates. Physical-device VoiceOver and large Dynamic Type are not certified by this visual pass. The web empty-note rendering warning was fixed by guarding empty strings; SVG editor metadata was removed without changing TMDB artwork. No new native binary is needed for the JavaScript and style changes; Metro updates the installed development app.

## Final design review — Pass

| Finding                                 | Status   | Evidence                                                                                                                         |
| --------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Discover row size and repeated metadata | Resolved | 62-point posters, 19-point Georgia titles, no synopsis, year/type shown once with genres or recommendation reason.               |
| Discover header density                 | Resolved | Tighter header spacing; supplemental disclosures moved to footer; filters and catalog modes retained; two complete rows visible. |
| Home inset’s redundant top margin       | Resolved | Section inset removes the inherited 24-point margin; native screenshot confirms tighter spacing.                                 |

The independent Impeccable finish reviewer returned Pass after this bounded correction batch. Root DESIGN.md and its sidecar document the approved built world for subsequent work.
