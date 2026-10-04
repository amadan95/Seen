# Foundation contracts

Source: packages/contracts/src/index.ts. All incoming persisted preview state is parsed using Zod. Unknown schema versions fail visibly without overwriting stored state.

Production mutation envelope: operation_id (UUID), schema_version (1), kind, target_id (UUID), base_revision (nonnegative integer), payload. Actor derives from the authenticated session. Task 06 adds actor-scoped receipts, canonical payload hashes, transaction commits and conflict responses. Local preview event IDs are namespaced strings; they are never sent to a production mutation endpoint.

Error envelope: code, message, request_id and retryable. Codes distinguish validation, authorization, conflict, rate limit, upstream and internal errors. Cursor page: items and nullable next_cursor. Cursors are opaque and server-issued when pagination is implemented.

Rank snapshot: format, source revision, model version, score-scale version, and complete items. Items expose media ID, position, nullable rankScore, evidence label and opponent count to the owner. Public projections must be separate authorized DTOs. No current client fetches another user's data.

User-facing score uses 10 × sigmoid(latent), rounded half-up to one decimal; unplaced titles have null. Internal fits are never passed into UI components. Movies and TV have independent scopes. Genre/Top views filter canonical snapshots.

Production catalog IDs will be stable UUIDs distinct from supplier movie/TV IDs. The fixture catalog's string IDs are scoped solely to local previews; migration into authenticated user data will require an explicit mapping/import path.
