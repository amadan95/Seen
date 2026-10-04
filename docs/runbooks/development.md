# Development and release gates

1. Install Node/pnpm and run pnpm install --frozen-lockfile, then pnpm check.
2. Inspect the local preview with pnpm web or build the native development client using pnpm ios.
3. With Docker/Podman, start Supabase, reset the local database and run SQL checks. These commands operate on seen-local, never a hosted project.
4. Bundle the shared domain with pnpm edge:bundle and run the Deno smoke. For staging deployment, authenticate the CLI and specify an owner-provided staging project ref explicitly. Never infer production refs.
5. Complete real-device navigation, Dynamic Type/VoiceOver, Reduce Motion and storage/restart exercises before calling task 01 accepted.
6. Configure isolated Supabase projects, native signing and EAS project linkage. Native auth also requires Apple capability/provider and email configuration.
7. Work through docs/backlog.md sequentially. Public release needs all MVP/security/data/privacy/moderation/deletion gates, supplier approval and a separate owner-authorized submission.

Local preview data can be exported from Settings. Changing an opinion invalidates touching active comparisons via revision matching. An undo during the same screen removes the just-added comparison event. A log undo refuses if a newer local mutation occurred, so it cannot overwrite unrelated work.

Native SQLite is not represented as encrypted, cloud-synced or excluded from OS backups. Production account partitioning, secure sessions, outbox retry/conflict resolution and cleanup are separate tasks. Do not attach real personal data to shared test fixtures.
