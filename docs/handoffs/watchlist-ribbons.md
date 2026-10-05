# Poster watchlist ribbons — historical handoff, October 4, 2026

**Superseded:** on October 4, after the user asked to remove the control, the top-right watchlist ribbons were removed from all posters. Posters now open their title; the existing Watchlist action remains on the title detail screen. `DESIGN.md` documents the current behavior.

The notes below record the implementation and checks from the preceding commit. They describe that earlier version, not the current UI.

Added the existing Seen eye artwork to a top-right ribbon on the shared `Poster` component. This covers welcome posters, Home rails, Discover/search, detail, logging sheets, ranking/watchlist/profile/history rows and comparison posters, for both movies and TV. Live artwork, sample art and unavailable-poster fallbacks share the control.

The ribbon shows a plus when absent and a check with an ivory outline when saved. Compact posters use a smaller visual ribbon with a minimum 44-by-44-point target. Each ribbon exposes an independent labeled button and selected/busy/disabled state. Poster navigation and comparison choices are sibling press targets rather than enclosing buttons, avoiding nested-button activation and hidden accessibility actions. Duplicate text tap areas remain clickable but stay out of the accessibility/keyboard order.

Membership uses the existing desired-state domain mutation and shared library. A write retains referenced live metadata and acknowledges state only after SQLite/localStorage succeeds. While saving, show progress and prevent repeated activation; failed writes preserve membership and offer a retry message. Other poster copies, detail actions, watchlist and counts update from the same accepted library state. Manual re-add of a watched title remains allowed.

Validation: ESLint, strict workspace TypeScript and all 29 existing unit tests passed. iOS Hermes and web exports passed with the original logo bundled. In the iOS 27 simulator, exercised live Stalker detail save and sample Community compact-row save, verified separate accessibility buttons and synchronized copies/counts/detail state, and verified both memberships after a full app restart. This is the existing local preview; cloud sync and physical-device/VoiceOver acceptance remain pending.
