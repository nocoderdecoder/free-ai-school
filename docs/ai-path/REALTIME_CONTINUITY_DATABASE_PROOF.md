# Realtime continuity database proof contract

Status: required pre-activation proof for the dormant paid-Realtime admission
boundary. Nothing in this contract enables a route, authorizes spend, or calls
a provider.

## Authority split

Cross-version continuity is owned by the database, not reconstructed from
caller-supplied HMAC candidates.

1. An `authenticated` request issues a short-lived admission intent for one
   assessment session. The security-definer RPC derives the owner exclusively
   from `auth.uid()`, loads the session by both session ID and owner ID, and
   verifies a database-defined reservable state. It never trusts an owner ID,
   continuity UUID, policy limit, clock, or expiry supplied by the caller.
2. The database creates or loads private random subject and session continuity
   UUIDs. The subject mapping is unique per authenticated owner and the session
   mapping is unique per assessment session and subject. Neither mapping is
   returned to the client.
3. The authenticated RPC returns exactly an opaque intent ID, the pinned policy
   identifier, and a database-created expiry. An intent is short-lived,
   single-session, single-policy, and can authorize at most one reservation.
4. A `service_role` RPC atomically consumes the intent and reserves capacity.
   It receives the intent ID, server-generated idempotency key, estimate, and
   exact policy identifier. It cannot provide owner/session continuity UUIDs,
   override caps or TTL, choose a UTC day, or choose lease timestamps.
5. Finalize, cancel, and maintenance remain service-only and operate on the
   database-owned reservation identity. They cannot rewrite its subject,
   session, intent, policy, estimate, idempotency scope, or lease.

Operational reserve/finalize/cancel RPCs do not use versioned HMAC candidates.
Retaining such candidates would reintroduce an unprovable claim that several
opaque tuples represent the same identity. The obsolete application keyring was
removed, and the final SQL overloads accept no HMAC user or session keys.

## Storage and deletion

The private mapping and intent tables must have forced RLS, no direct grants to
`anon`, `authenticated`, or `service_role`, and only the narrow reviewed RPC
surface. The ledger stores stable random continuity UUIDs, never raw owner IDs
or rotating HMAC keys. A private mapping may reference existing owner/session
records because those records already contain the authoritative ownership
relationship; that linkage must not appear in a reservation response, archive,
or operational log.

- Unused or expired intents are purged in bounded batches after their short
  replay window.
- Assessment-session and direct `auth.users` deletion take the admission lock
  before their cascades. Either path is rejected while any associated lease is
  unexpired. Elapsed leases are first transitioned to `expired`, after which
  raw owner/session mappings and intents cascade away.
- The ledger retains its unique opaque admission-intent capability without a
  foreign key to those raw mapping tables. It therefore remains pseudonymous
  and lifecycle-reconcilable for seven days after source/account deletion, then
  follows the 90-day terminal-detail policy.
- Terminal detail follows the fixed 90-day policy. Purge and archive are one
  transaction, and the archive remains content-free.

## Database policy authority

One database-owned policy generation pins disabled state, every concurrency and
budget cap, reservation TTL, intent TTL, and policy identifier. RPC callers may
only attest the exact identifier. A mismatch fails closed; values are never
accepted as parameters. Policy reads and every mutating admission RPC acquire
the same transaction-scoped advisory lock before making a decision.

The migration must refuse to replace the old opaque-key model if its ledger is
non-empty. Silently labeling or converting old rows cannot establish stable
continuity. Because the paid path is still dormant, empty-ledger cutover is the
only supported migration path.

## Timeout and unknown commit

The application deadline is four seconds, so the database/PostgREST statement
timeout must be lower, with 3.5 seconds as the activation ceiling. This reduces
late work but does not eliminate the response-lost-after-commit case.

After any reserve timeout, the application makes zero provider calls and retries
the same intent and idempotency key to discover the durable result. It never
mints a second attempt. Finalize timeouts are retried with the identical amount.
A bootstrap whose provider outcome is unknown is never cancelled merely because
the application response timed out.

## Required behavioral proof

The disposable database suite must demonstrate:

- anonymous and service-role intent issuance are denied;
- authenticated issuance succeeds only for `auth.uid()`'s owned reservable
  session and returns no owner or continuity identifier;
- two intents for the same owner/session resolve to one private subject/session
  mapping without exposing it;
- service role cannot directly read mappings, intents, ledger, policy, or
  archive tables;
- reserve consumes one valid unexpired intent, replays the same idempotency key,
  and rejects intent reuse with a conflicting request;
- owner/session uniqueness and user budgets are enforced through stable UUIDs;
- caller attempts to supply caps, TTL, clock, expiry, owner, session, continuity,
  or HMAC keys have no final executable overload;
- database disabled state and policy mismatch deny reservation;
- policy caps hold in true concurrent connections;
- timeout or lock failure creates at most one reservation and authorizes zero
  provider calls; exact retry discovers or creates that one result;
- maintenance is bounded and cannot race reserve, finalize, or cancel; and
- active direct source/account deletion is blocked, while elapsed direct
  account deletion cascades raw state and preserves reconciliable ledger detail;
- the empty-ledger migration guard aborts before destructive schema replacement
  when a legacy row exists.
