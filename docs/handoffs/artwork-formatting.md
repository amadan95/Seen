# Artwork and iOS formatting — October 5, 2026

## Fixed

The reported score used a 34-point font inside Body’s inherited 25-point line height, clipping the numeral. Shared text now measures font size and line height together and explicitly scales both with the device fontScale. Automatic native font scaling is disabled on those shared texts only to avoid double scaling, preserving Dynamic Type. A native accessibility-large check caught and confirmed fixes for clipped headings/captions too. Larger text stacks ranking information and detail actions. Screens beneath native headers no longer apply a second top safe-area inset.

## Simplified

Detail prioritizes an uncropped poster, title, one metadata line, correctly displayed personal score and logging/watchlist actions. Synopsis, cast and metadata use progressive disclosure. Streaming options show one Stream/Rent/Buy group, logo tiles and short names; checked time and caveats expand while source attribution remains visible. Discover and Watchlist use poster grids. Ranking/history posters are larger with less repeated metadata; filters, sorting and score explanations remain accessible. Home’s poster rail precedes the ranking panel. Logging keeps larger artwork and a short question. Comparisons, local data and ranking semantics are unchanged.

## Verified

- `pnpm check`: lint, workspace TypeScript and all 37 tests passed.
- iOS Hermes and web exports passed.
- iOS Arrival detail inspected at normal and accessibility-large text sizes; full numeral, heading and captions visible. Simulator text size restored to original large.
- Browser at phone width: Home, Discover, Watchlist, Rank and detail inspected. Rent changed provider group; availability timestamp and full title metadata expanded correctly. No watch or comparison answer was submitted.
- Mechanical detector: no findings in the first bounded inspection.

Remaining limits: physical-device VoiceOver, other locales and the full Dynamic Type size range are not certified by this pass. The existing local preview/TMDB bridge remains; hosted accounts and remote sync are unchanged release gates.
