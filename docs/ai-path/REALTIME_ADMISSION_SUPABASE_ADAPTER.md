# Dormant Supabase Realtime admission adapter

Status: implemented against schema `20260717080000`, but unreachable while its independent literal-false gateway and policy latches remain closed.

## Split-credential boundary

The adapter deliberately uses two already-created Supabase clients:

- the authenticated user client may call only `issue_ai_path_realtime_admission_intent(policy, assessment_session)` so Postgres can prove `auth.uid()` ownership;
- the service-role client may call only reserve, finalize, and cancel with opaque intent/reservation IDs.

The server factory requires exact schema, credential-scope, SQL-proof, lifecycle-proof, policy-version, and policy-ID attestations. It accepts no caller policy or caps. Construction makes no network call and the module is not imported by a public route.

Every command and response uses exact keys and bounded values. Reservation responses contain the opaque intent capability and no raw owner/session or database-continuity identifier. Finalize and cancel must present that original branded intent, and Postgres verifies the intent/reservation pair before mutation. Database/provider errors are normalized to content-free gateway errors and are never logged or returned.

## Deadlines and ambiguous commits

Intent, reserve, finalize, and cancel use a fixed four-second client deadline. The RPC transport receives an `AbortSignal`, while an independent promise deadline also bounds a non-cooperative transport.

A timeout is not proof of rollback. Intent issuance is retry-safe for the same owned session and policy. Reserve retries must reuse the exact intent ID, idempotency key, and estimate; a consumed intent resolves the committed reservation or fails closed. No provider bootstrap may occur after an ambiguous result. Finalize retries use the same reservation and amount. Cancellation is never inferred from a lost bootstrap response.

## Bounded maintenance adapter

The separate maintenance adapter calls only:

```text
maintain_ai_path_realtime_admission(
  policy_id,
  expire_limit,
  purge_limit,
  intent_cleanup_limit,
  mapping_gc_limit
)
```

Each limit is an integer from 1 through 1,000. The exact response contains the pinned policy ID, retention cutoff, bounded expiry/purge/intent/mapping counts, status totals, four continuation flags, and their exact combined OR. The server runner closes over the reviewed policy ID, requires schema `20260717080000`, and remains behind a separate literal-false latch. It has a fixed fifteen-second client deadline and is not wired to a scheduler.

## Activation prerequisites

Before opening any latch:

1. Apply all eight migrations to an empty disposable PostgreSQL 15+ database.
2. Pass the real role/RLS/signature, continuity, ownership, disabled-policy, concurrency, rollback, timeout, and archive suite.
3. Prove unknown-commit recovery with zero provider calls on every ambiguous path.
4. Capacity-test bounded maintenance alongside reserve/finalize/cancel.
5. Complete authenticated route integration, distributed abuse controls, monitoring, incident rollback, and explicit paid-service approval.

Until then this is testable infrastructure, not evidence that production Realtime is ready.
