# Realtime admission control

Status: deterministic contract, local/test adapter, and dormant durable SQL foundation. Production activation is impossible while `AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH` is `false`.

## Purpose

Realtime admission is the mandatory authorization-and-budget boundary immediately before any paid Realtime bootstrap. It does not use IP addresses, browser claims, environment attestations alone, or the model provider as an authority. It limits estimated spend; provider billing remains the final accounting source.

The contract provides:

- stable opaque user and session keys derived with domain-separated HMAC;
- exact verified-user/session-owner matching;
- one atomic reservation operation for concurrency and daily budget checks;
- per-user and global concurrent-session limits;
- per-user and global UTC-day estimated-cent limits;
- idempotent reserve, finalize, and cancel operations;
- expiring leases so crashed callers do not hold concurrency forever;
- late finalization so expired leases still record usage already incurred;
- fail-closed behavior when the store throws or returns a mismatched record.

No file in this slice reads credentials, trusts forwarded IP headers, makes a network request, or calls OpenAI.

## Dormant durable SQL foundation

Migration `20260717040000_ai_path_realtime_admission.sql` defines a ledger and three service-only RPCs: reserve, finalize, and cancel. Applying the migration does not activate a caller, open either Realtime latch, or make a paid request.

The ledger stores 64-character HMAC-derived user/session keys, a SHA-256 hash of the bounded server-generated idempotency key, integer cents, UTC day, lease timestamps, and terminal state. Reserve responses echo the validated caller key; finalize/cancel responses use the stored 64-character hash as a contract-valid opaque idempotency value, so no raw key needs to be retained. It has no columns for raw auth user IDs, assessment IDs, IP addresses, SDP, audio, transcripts, prompts, or answers. RLS is enabled and forced, no table policy exists, and even the service role has no direct table grant; its only interface is the reviewed security-definer RPC set. Each RPC independently checks the verified service-role JWT claim.

All three mutations take the same transaction-scoped PostgreSQL advisory lock. Reserve expires stale leases and then performs idempotency, one-session, per-user/global concurrency, and per-user/global UTC-budget checks before inserting. Because the lock is acquired before any check, it also serializes the important empty-table and empty-budget-row cases. Finalize and cancel use the same lock, so they cannot race a reserve decision. Finalize deliberately accepts an expired lease to record provider usage that may already have occurred; cancel accepts only an active reservation.

The global lock favors correctness over throughput. It is a foundation, not activation proof. Before opening a latch, apply the migration in a disposable Supabase project and run true multi-connection tests that demonstrate lock behavior, transaction rollback, RPC role claims, RLS/grants, timeout behavior, and adequate throughput. Static source-contract tests cannot prove PostgreSQL behavior across simultaneous connections.

## Required call sequence

The public Realtime route must not call OpenAI unless every step succeeds in order:

1. Verify the cookie-backed Supabase user with `auth.getUser()`.
2. Load the assessment session through an owner-scoped query and confirm it is in a reservable state.
3. Build a `RealtimeAdmissionBinding` on the server from the verified principal, owned session, and a secret of at least 32 characters. Never accept `userKey` or `sessionKey` from the browser.
4. Resolve the durable production admission capability. Environment attestations are necessary but insufficient; the literal code latch must also be open after review.
5. Call `reserve` with a fresh idempotency key and a conservative maximum session-cost estimate.
6. Only when the result is `status: "admitted"`, pass the reservation ID through the internal server call chain and bootstrap Realtime.
7. If bootstrap definitely failed before any provider usage, call `cancel`.
8. If bootstrap may have succeeded, do not cancel merely because the response was lost. Reconcile conservatively and call `finalize` with actual or defensibly estimated cents.
9. On normal disconnect, finalize exactly once. Retrying the same actual amount is idempotent; a conflicting amount fails closed for investigation.

The existing public Realtime readiness latch and the admission latch are separate. Both must remain closed until the durable adapter, authentication, session ownership, distributed rate limiting, spend approval, and incident rollback have passed review.

## Reservation semantics

- Amounts are integer US cents. Floating-point currency is not accepted.
- Active estimates and finalized actuals both consume the reservation's UTC-day budget.
- UTC budgets reset at `00:00:00Z`; active reservations from the prior day still consume concurrency until finalized, cancelled, or expired.
- Cancellation releases concurrency and the estimate but does not permit reuse of the idempotency key.
- Expiry releases concurrency and the estimate. Late finalization remains allowed because expiry cannot erase provider usage that already happened.
- Actual cost may exceed the estimate. It is recorded and returned with `budgetExceeded: true`; future reservations remain blocked by the updated daily total. The estimate should therefore be a conservative upper bound.
- The same user/session cannot have multiple active reservations, even with different idempotency keys.
- Idempotency keys are scoped to the opaque user key. Reusing one with different session or amount is a conflict.

## Production adapter contract

`RealtimeAdmissionRepository` is the production seam. Each of `atomicReserve`, `atomicFinalize`, and `atomicCancel` must be one durable atomic transaction. A read/check followed by an independent write is not conformant.

A production implementation should use database uniqueness and transactional locking for:

- reservation ID and `(user_key, idempotency_key)` uniqueness;
- at most one active reservation per opaque session key;
- user/global concurrency counters;
- user/global UTC-day reserved and finalized cents;
- terminal-state and conflicting-finalization rejection.

The adapter must store only opaque keys, never raw Supabase user IDs, assessment session IDs, cookies, API keys, SDP, transcripts, or IP addresses.

## Tests required before opening the latch

In addition to the deterministic contract tests, run real multi-connection integration tests against the production database adapter:

- two concurrent requests at the last global slot produce exactly one admission;
- two concurrent requests for the same user/session produce exactly one reservation;
- a process crash between reserve and bootstrap is recovered by expiry;
- reserve retries return the original ticket and never double-charge estimates;
- finalize/cancel retries are idempotent and conflicting finalization fails;
- UTC rollover resets only spend buckets, not active concurrency;
- store timeout, deadlock, serialization failure, or malformed response denies admission and produces no OpenAI call;
- cross-user reservation IDs return binding mismatch without revealing another user's data;
- daily user/global caps remain correct under concurrent finalize and reserve operations;
- the public route's OpenAI fetch spy is called zero times for every non-admitted outcome.

## Operational risks and gates

- The in-memory adapter is process-local and must never be treated as production-ready.
- Reservation estimates are not invoices. Reconcile against provider usage and alert on estimate drift.
- The lease TTL must exceed the maximum permitted Realtime session duration. Expiry before disconnect creates a temporary budget gap until late finalization.
- Define and test a ledger-retention/purge policy before activation; the dormant migration intentionally does not guess an accounting-retention period.
- Define emergency global disable, daily project budget, alert thresholds, and rollback ownership before spend is approved.
- Rotating the HMAC secret changes opaque keys and therefore breaks continuity. Use managed rotation with an overlap/migration strategy.
