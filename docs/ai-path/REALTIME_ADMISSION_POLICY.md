# Realtime admission policy contract

Status: implemented as a dormant, server-only private-alpha contract. It does
not approve spend, enable OpenAI Realtime, open a route, or call a service.

## One policy per reviewed artifact

The durable Supabase construction path no longer accepts caps from its caller.
Every application instance compiled from the same reviewed artifact receives
the immutable `AI_PATH_REALTIME_ADMISSION_POLICY` object. Its policy identifier
is derived from the version and every cap, so a caller cannot attest a version
while silently changing one limit.

Private-alpha policy `2026-07-17.v1` is pinned to:

- 2 concurrent reservations globally and 1 per user;
- 100 cents per user per UTC day and 1,000 cents globally per UTC day;
- 100 cents for one reservation; and
- a 120-second reservation lease.

These are conservative ceilings, not a budget allocation or authorization to
spend. The generic domain service remains configurable only for deterministic
tests and local simulations.

## Fail-closed rollout

Durable construction requires exact `policyVersion` and derived `policyId`
attestations in addition to schema, service-role, atomic-SQL, and lifecycle-SQL
proof. It is then stopped by two independent literal-false code latches: the
policy-rollout latch and the Supabase gateway latch. Environment variables
cannot override either latch.

Before opening them, disposable-database tests must prove that the SQL RPCs
enforce the exact pinned caps under real concurrent connections. A reviewed
follow-up should make the database validate the exact policy identifier rather
than trusting service-role cap parameters. Until that proof and explicit spend
approval exist, this contract only removes per-instance configuration drift in
the reviewed application construction path.
