# Trusted report writer

Status: implemented and testable, but deliberately disabled. Migration
`20260717020000_ai_path_trusted_report_writer.sql` has not been applied by this work.
The application latch `AI_PATH_TRUSTED_REPORT_WRITER_LATCH` remains `false`.

## Trust boundary

An assessment report is derived authorization-sensitive data, not a client input.
The browser may submit reviewed assessment answers, but it must never submit skill
levels, evidence, recommendations, report versions, or a completed report for
persistence. A trusted server flow must:

1. verify the user with Supabase `getUser()`;
2. load the session with the verified owner ID;
3. validate reviewed transcript/evidence inputs;
4. recompute the report with the pinned server taxonomy, scoring, report, and catalog versions;
5. advance the session through the allowed lifecycle to `analysis_pending`;
6. call the trusted writer with a server-generated UUID idempotency key.

The ordinary authenticated repository still throws from `saveReportOwned`. Only a
separately injected service-role client can call the completion RPC, and the RPC is
revoked from `public`, `anon`, and `authenticated`. The server module never reads or
creates the service-role credential; it accepts a preconfigured server-only client.

## Database invariants

- Completion is one atomic `analysis_pending` to `complete` transition under a row lock.
- Session ID and verified owner ID must identify the same row; failures do not reveal another owner.
- Report goal and all four report versions must match the pinned session values.
- JSON shape and a 1 MiB maximum are checked before persistence.
- SHA-256 is computed inside Postgres from canonical `jsonb` text; callers cannot provide the digest.
- A retry succeeds only when write ID, digest, and report are all identical.
- A reused key or completed session with different content fails closed.
- A trigger blocks report writes outside the trusted RPC and makes completed rows immutable.
- Retention remains hard deletion; completed content cannot be silently rewritten or extended.

## Threat notes

| Threat | Control | Remaining validation |
| --- | --- | --- |
| Browser forges high scores or recommendations | No authenticated `UPDATE`; trusted RPC is service-role-only; server recomputation contract | Route integration must prove no client report field reaches the writer |
| User writes another user's report | Verified principal owner ID plus atomic `id AND owner_id` row lock | Disposable-project RLS/RPC integration test |
| Replay changes a completed result | Stable write UUID plus server SHA-256 and exact JSON equality | Concurrent transaction test in Postgres |
| Version downgrade or mixed catalog/scorer | Adapter and RPC both pin all four versions; table versions are immutable | Deployment schema attestation |
| Service key leaks into user routes/client bundle | Separate server-only factory, no key creation in this module, code latch closed | Secret scanning and deployment bundle inspection |
| Direct service-role table mutation | Report-protection trigger rejects writes outside the RPC marker | Privileged integration test; operational access audit |

## Activation gate

Do not open the code latch until all of these are complete:

- apply both AI Path migrations to a disposable Supabase project;
- add authenticated/anonymous/service-role RPC permission integration tests;
- add concurrent exact-retry and conflicting-replay tests;
- wire an explicit `analysis_pending` transition boundary;
- prove the route recomputes reports and never accepts a report payload;
- configure a server-only service-role client with key rotation and redacted logging;
- add distributed rate limiting, monitoring, rollback, deletion, and retention job checks;
- apply and attest the production migration separately from application deployment.
