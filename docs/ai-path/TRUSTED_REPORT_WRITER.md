# Trusted report writer

Status: implemented and testable, but deliberately disabled. The trusted writer
is defined by migration `20260717020000_ai_path_trusted_report_writer.sql`. The
owner-bound lifecycle seam is added by
`20260717090000_ai_path_analysis_transition.sql`, so the runtime now requires
the schema through `20260717090000`; none of these migrations has been applied
by this work.
The application latch `AI_PATH_TRUSTED_REPORT_WRITER_LATCH` remains `false`.
The separate `AI_PATH_TRUSTED_ANALYSIS_TRANSITION_LATCH` also remains `false`.
The request-scoped assembly in `durable-trusted-analysis-runtime.server.ts` has
its own `AI_PATH_DURABLE_TRUSTED_ANALYSIS_RUNTIME_LATCH`, also fixed at `false`,
and no public runtime imports it.

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
6. call the trusted writer with the analysis attempt UUID persisted by Postgres.

Step 5 is now an explicit service-role-only RPC. It locks the row by the
verified `(session ID, owner ID)` pair and permits only `consented` text sessions
or `ending` voice sessions to enter `analysis_pending`. Expired sessions and
rows with any report metadata fail closed. On first entry, Postgres persists the
proposed attempt UUID and a database-owned start timestamp. An exact request
retry on either an already-pending or completed row recovers that original
binding, even if the caller proposes a new UUID. The trigger rejects attempts
to enter `analysis_pending` without the RPC's transaction-local marker.

The dormant coordinator recomputes with the persisted start timestamp as the
report's `generatedAt` and completes with the persisted attempt UUID. A timeout
at either RPC boundary returns a content-free, retryable reconciliation result;
it never guesses whether the transaction committed. A later retry recovers the
same UUID and timestamp, recomputes byte-stably, and lets the trusted writer's
exact-replay rule reconcile an unknown completion commit.

The ordinary authenticated repository still throws from `saveReportOwned`. Only a
separately injected service-role client can call the completion RPC, and the RPC is
revoked from `public`, `anon`, and `authenticated`. The server module never reads or
creates the service-role credential; it accepts a preconfigured server-only client.

## Database invariants

- Completion is one atomic `analysis_pending` to `complete` transition under a row lock.
- Analysis entry is one atomic, owner-bound transition under a row lock: text
  `consented` to `analysis_pending`, or voice `ending` to `analysis_pending`.
- Analysis attempt UUID and start timestamp are immutable after the first
  transition; completion must use that UUID and an identical `generatedAt` instant.
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
| Browser forges high scores or recommendations | No authenticated `UPDATE`; both lifecycle and completion RPCs are service-role-only; server recomputation contract | Route integration must prove no client report field reaches either boundary |
| User writes another user's report | Verified principal owner ID plus atomic `id AND owner_id` row lock | Disposable-project RLS/RPC integration test |
| Replay changes a completed result | Stable write UUID plus server SHA-256 and exact JSON equality | Concurrent transaction test in Postgres |
| Timeout leaves commit outcome unknown | Transition replay returns the persisted attempt UUID/timestamp; coordinator never generates a replacement write binding | Request retry and fault-injection evidence |
| Version downgrade or mixed catalog/scorer | Adapter and RPC both pin all four versions; table versions are immutable | Deployment schema attestation |
| Service key leaks into user routes/client bundle | Separate server-only factory, no key creation in this module, code latch closed | Secret scanning and deployment bundle inspection |
| Direct service-role table mutation | Report-protection trigger rejects writes outside the RPC marker | Privileged integration test; operational access audit |

## Activation gate

Do not open the code latch until all of these are complete:

- apply and attest all AI Path migrations through `20260717090000` in a disposable Supabase project;
- add authenticated/anonymous/service-role RPC permission integration tests;
- add concurrent exact-retry and conflicting-replay tests;
- assemble the verified-user analysis route with the dormant transition and
  completion adapters without ever accepting a client report payload;
- review and separately open the transition, writer, and request-assembly code
  latches only after that route has closed integration evidence;
- prove the route recomputes reports and never accepts a report payload;
- configure a server-only service-role client with key rotation and redacted logging;
- add distributed rate limiting, monitoring, rollback, deletion, and retention job checks;
- apply and attest the production migration separately from application deployment.
