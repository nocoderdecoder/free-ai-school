# Dormant Supabase Realtime admission adapter

Status: implemented but impossible to construct in production while this
independent reviewed latch remains closed:

```ts
AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH = false as const
```

This adapter is an application boundary for the service-role-only reserve,
finalize, and cancel RPCs defined by migration
`20260717040000_ai_path_realtime_admission.sql` and constrained by lifecycle
migration `20260717070000_ai_path_realtime_admission_lifecycle.sql`. It does not
create a public route, read credentials, call OpenAI, enable Realtime, or modify
the separate public and admission-production latches.

## Boundaries

- `realtime-admission-supabase.ts` exposes a narrow client with only the three
  reviewed RPC names. It has no table, auth, storage, logging, or arbitrary-RPC
  API.
- Every command is validated before transport access, including opaque binding
  keys, UUIDs, UTC timestamps, integer cents, policy limits, and exact lease
  duration.
- Every provider wrapper and RPC payload is treated as untrusted. Successful
  objects require an exact key set, bounded values, known lifecycle states, and
  binding/reservation agreement. Unknown denial or terminal states fail closed.
- Provider errors and thrown transport details are replaced with a stable
  `SupabaseRealtimeAdmissionGatewayError`; database messages are never returned
  or logged.
- `realtime-admission-supabase.server.ts` accepts an already-created service-role
  client. It no longer accepts caller-supplied caps: every durable instance uses
  the immutable server-only policy described in `REALTIME_ADMISSION_POLICY.md`.
  Construction additionally requires exact activation, schema-version,
  credential-scope, atomic-SQL-proof, lifecycle-SQL-proof, policy-version, and
  derived-policy-identifier attestations, but none can override the independent
  literal-false policy-rollout and gateway latches.

## Fail-closed transport deadlines

Admission RPCs have a fixed four-second deadline and the bounded maintenance RPC
has a fixed fifteen-second deadline. These values live inside the dormant
transports; route, factory, and operation inputs cannot extend or disable them.
Each call receives an `AbortSignal`, and the server-only Supabase wrappers attach
it to the PostgREST RPC builder. A Promise deadline also bounds the caller if a
test double or future transport fails to honor cancellation.

An admission timeout is normalized by the admission service to
`store_unavailable`, so the result can never authorize a paid provider call. A
maintenance timeout becomes the content-free `rpc_timeout` runner error. Neither
error includes database codes, messages, row data, credentials, or provider
details. Cancellation is best-effort at the HTTP/database boundary; the durable
RPCs remain atomic and idempotent because a timeout cannot prove whether the
database committed before transport cancellation.

## Dormant lifecycle maintenance adapter

`realtime-admission-maintenance-supabase.ts` is a separate narrow boundary for
only `maintain_ai_path_realtime_admission(p_expire_limit, p_purge_limit)`. Both
limits must be integers from 1 through 1,000. Its response parser accepts only
the reviewed policy version, an exact UTC timestamp, bounded transition and
purge counts, the three exact terminal status keys whose counts sum to the
reported purge total, and the exact `hasMoreToExpire`, `hasMoreToPurge`, and
combined `hasMore` booleans. It cannot return row identifiers or opaque
identity keys, and provider errors are normalized without logging details.

Its server factory has a separate literal-false maintenance latch plus exact
schema, service-role, lifecycle-proof, and retention-operations attestations.
It is not imported by a route or scheduler, so no maintenance mutation can run.

## Activation prerequisites

Do not open the adapter latch until all of the following are complete:

1. Apply and roll back all migrations through `20260717070000` in a disposable
   Supabase/PostgreSQL environment.
2. Prove the RPC role checks, grants, forced RLS behavior, exact timestamp
   contract, and malformed-response behavior.
3. Run true multi-connection races for the last global/user slot, the same
   session, idempotent retries, concurrent finalize/reserve, expiry, and UTC-day
   rollover.
4. Prove the fixed seven-day late-reconciliation window, database-derived
   90-day terminal/idempotency retention, content-free accounting archive, and
   bounded maintenance RPC under concurrent reserve/finalize/purge operations.
   Prove that reserve fails closed during an expiry backlog and that finalize
   and cancel transition only their target without a global expiry sweep.
5. Complete authenticated owner-scoped route integration, failure-path tests
   proving zero OpenAI calls, kill-switch and rollback operations, and explicit
   paid-service approval.

Until those steps pass, the adapter is testable infrastructure only. It is not
evidence that production Realtime is ready.
