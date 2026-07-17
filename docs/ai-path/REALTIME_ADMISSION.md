# Realtime admission control

Status: deterministic local contract plus dormant database-owned production foundation. Production activation is impossible while the admission, policy, gateway, and public Realtime code latches remain `false` and the database policy state remains disabled.

## Purpose

Realtime admission is the authorization, concurrency, and estimated-spend boundary immediately before any paid Realtime bootstrap. Provider billing remains the final accounting source. No current public route calls OpenAI or another paid provider.

The final dormant contract provides:

- authenticated database verification of the assessment-session owner;
- stable random continuity identifiers generated and owned by Postgres;
- one short-lived, single-purpose admission intent per eligible voice session;
- atomic per-user and global concurrency and UTC-day cent limits;
- database-owned policy caps, clock, UTC day, lease expiry, and kill switch;
- idempotent reserve, finalize, cancel, and unknown-commit recovery;
- seven-day late usage reconciliation and 90-day terminal detail retention;
- bounded expiry, archive, intent cleanup, and continuity-mapping collection.

## Trust boundary and data model

Migration `20260717080000_ai_path_realtime_admission_continuity_policy.sql` replaces the legacy HMAC design before activation. It refuses to run unless the legacy ledger and archive are empty; existing opaque rows cannot be safely guessed into authenticated ownership.

The authenticated RPC verifies `auth.uid()` against an eligible, retained voice assessment session and returns only `{intentId, policyId, expiresAt}`. Private forced-RLS mapping tables connect raw owner/session IDs to random continuity UUIDs. The accounting ledger stores only those random UUIDs, a policy ID, a SHA-256 idempotency hash, integer cents, UTC day, and lifecycle timestamps. It stores no raw user ID, assessment-session ID, IP address, SDP, audio, transcript, prompt, answer, or provider identifier.

Deleting a source account/session cascades its private mapping and intent. Retained ledger rows then become unlinkable pseudonymous accounting detail and are purged into content-free per-policy daily aggregates after the reviewed retention window.

All private tables force RLS and have no direct grant for `anon`, `authenticated`, or `service_role`. `authenticated` can execute only intent issuance. `service_role` can execute only reserve, finalize, cancel, and bounded maintenance. Every mutation takes the same transaction advisory lock. Every legacy caller-cap RPC overload is explicitly dropped.

## Required call sequence

The public Realtime route must not call OpenAI unless every step succeeds:

1. Verify the cookie-backed Supabase user with `auth.getUser()` and load their owned, reservable voice assessment session.
2. Create the private-branded local owner/session assertion.
3. Call authenticated intent issuance with the pinned policy ID and assessment-session ID.
4. Persist the returned intent and one server-generated idempotency key for this attempt.
5. Call the service-only atomic reserve RPC with only policy ID, intent ID, the same idempotency key, and a conservative integer-cent estimate.
6. Bootstrap a paid provider only after an exact `status: "admitted"` result.
7. If intent issuance or reserve times out, make zero provider calls. Retry with the same session/policy and then the same intent/idempotency/estimate tuple; never mint a replacement attempt.
8. Present the original intent ID with every finalize/cancel request; Postgres checks that lifecycle capability before mutation.
9. Cancel only when bootstrap definitely failed before provider usage. If usage may have occurred, reconcile and finalize instead.
10. Retry finalization with the same intent, reservation, and amount after an ambiguous response.

## Policy and lifecycle semantics

Private-alpha policy `2026-07-17.v1` is database-enforced at 2 global concurrent reservations, 1 per user, 100 cents per user per UTC day, 1,000 cents globally per UTC day, 100 cents per reservation, and a 120-second lease. These are ceilings, not spend approval.

The policy table derives its ID from every cap and is append-only. The singleton policy state is seeded with `admission_enabled = false`. Application attestations cannot override that state. Reserve reads all caps from Postgres and accepts no caller-supplied clock, day, TTL, or limits.

Assessment/account deletion takes the same admission lock. It is temporarily rejected while an unexpired paid lease exists; once the lease is terminal or elapsed, raw mappings may be deleted while the pseudonymous ledger and opaque intent capability still allow cost reconciliation. Policy rollover is likewise rejected until all intent and detailed reservation rows are drained.

Active estimates and finalized actuals count toward the UTC-day budget. Cancellation releases an estimate but does not make the intent reusable. Expiry releases concurrency; finalization may still reconcile incurred usage for seven days. Maintenance archives only terminal rows older than 90 days and never purges current-day detail.

## Proof still required before activation

Static tests establish source contracts but cannot prove PostgreSQL concurrency or transaction behavior. Run the fail-closed disposable-database harness with independent connections and prove:

- exact RLS, grants, signatures, policy identity, and disabled-state behavior;
- authenticated intent ownership, retry, expiry, cascade, and abuse bounds;
- one winner at the last global/user/session slot;
- stable idempotency, unknown-commit recovery, rollback, deadlock, and timeout behavior;
- direct source/account deletion blocking for live leases plus elapsed-account
  deidentification and intent-capability reconciliation;
- UTC rollover plus cross-policy continuity of user/global limits;
- seven-day reconciliation boundaries and 90-day archive/purge accounting;
- zero provider calls for every denied, malformed, ambiguous, or failed admission.

Even after database proof, live OpenAI Realtime remains blocked pending explicit spend approval, production Supabase/auth configuration, distributed abuse controls, monitoring, incident rollback, privacy review, and route-level integration tests.
