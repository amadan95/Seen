# Working on Seen

Read docs/spec.md, docs/backlog.md and docs/handoffs/initial-build.md before changing product behavior. The specification governs semantics; ImageGen boards govern visual direction, not sample numbers.

Use the pnpm workspace and strict TypeScript. Routes compose UI; packages/contracts validate boundaries; packages/domain has no network/database/native dependencies. Run pnpm check and SDK compatibility checks for changed native dependencies. Domain source is bundled for Edge with pnpm edge:bundle; never hand-edit the generated bundle.

This first commit is a local fixture preview plus Phase 0 scaffolding. Do not claim tasks 02–22 complete or silently treat the preview store as the production service. Continue the backlog sequentially with migrations, actor authorization, RLS and server-authoritative ranking. No credentials in the client. No speculative social activity, percentages or availability claims.

Save sentiment durably before automatically opening targeted comparisons. Continue placement until a score exists; allow finishing later when no useful pair remains. Keep separate movie/TV fits, TV eligibility explicit, unknown dates/runtime honest, private notes local/owner-only. Sentiment alone does not generate scores; score filters do not refit. Preserve pending data before reporting save success. Record actual tests and remaining owner/tooling gates in a handoff.

Never deploy, submit to Apple, provision paid vendors or purchase services without user authorization. The requested initial GitHub push is authorized.
