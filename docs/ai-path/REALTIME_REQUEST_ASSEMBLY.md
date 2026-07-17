# Realtime request assembly and reconciliation

Status: dormant provider-free production foundation. Request assembly and
provider lifecycle orchestration remain disabled by independent literal-false
code latches. No public route imports this runtime, and no provider call is made.

## Request-scoped split credentials

`createRealtimeBootstrapRequestRuntime` is the server-only assembly boundary for
the authenticated preparation sequence. Its order is deliberately fail-closed:

1. require the request-assembly, authenticated-bootstrap, production-admission,
   policy-rollout, and Supabase-admission gateway code latches;
2. require the durable authenticated Supabase capability;
3. require the exact schema, credential-scope, SQL-proof, policy-version, and
   policy-ID attestations;
4. verify the cookie-authenticated user once with the request-scoped public
   Supabase client;
5. only then read the server-only service credential and construct a separate,
   non-persistent service-role client;
6. reuse the authenticated client for owned-session lookup and admission-intent
   issuance, while the service-role client is narrowed to opaque admission RPCs.

The runtime returns only the assessment request runtime and the admission
service. It does not return either raw client or credential. It has no OpenAI
credential, URL, safety header, provider client, `fetch`, SDP presenter, or
public-route import.

The credential split is enforced again by PostgreSQL grants: `authenticated`
may issue an owned intent, while `service_role` may reserve, finalize, and
cancel only through the capability-bearing intent/reservation tuple. The
service-role client does not persist a browser session, inspect a callback URL,
or refresh tokens.

## Unknown-commit lifecycle contract

`reconcileMockRealtimeProviderLifecycle` is a deterministic provider-free model
for the lifecycle decision after an exact reservation. It accepts only four
strict trusted-observation shapes:

| Observation | Admission action | Provider retry |
| --- | --- | --- |
| `unknown_commit` | none; reconciliation remains required | never |
| `confirmed_active` | none; wait for a terminal observation | never |
| `confirmed_absent` | idempotent cancel with the original tuple | never |
| `confirmed_ended` plus bounded integer cents | idempotent finalize with the original tuple | never |

Unknown fields, forged prepared state, fractional/negative/oversized cost, and
adapter failure return a bounded reconciliation failure without identities,
SDP, provider data, or error text. An ambiguous provider response is never
treated as proof of rollback, and this contract never authorizes minting a new
provider attempt.

## Evidence still required

The source contract is not staging evidence. Before any latch review, an
isolated non-production deployment must prove:

- one verified request context and exactly separated JWT roles in RPC audit
  evidence without recording tokens or cookies;
- same-origin, anonymous, unowned, expired, killed, capacity, budget, database
  timeout, and malformed paths all produce zero provider invocations;
- reserve timeout replay uses the exact intent, idempotency key, and estimate;
- a mock provider transport proves unknown, active, absent, and ended outcomes,
  including ambiguous cancel/finalize responses and idempotent retries;
- credentials are stored server-side with redaction, rotation, and revocation;
- the public route remains closed until explicit paid-use, privacy, security,
  abuse-control, incident-response, and release approvals are recorded.

No existing credentials, environment variables, successful database proof, or
provider availability can substitute for a reviewed literal-latch change.
