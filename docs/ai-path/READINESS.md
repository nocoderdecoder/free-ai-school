# AI Path readiness gate

`scripts/ai-path-readiness.mjs` is the deterministic, read-only readiness gate for the AI learning advisor. It separates two claims that must not be conflated:

- **Safe private alpha** means the expected source foundation is present and every production mutation, paid-network, and external sink gate is still locked in source.
- **Production ready** additionally requires production infrastructure and operational evidence. The checker currently reports this as `NO` because those external proofs have not been supplied and must never be inferred from credentials or environment variables.

## Run it

Human-readable status for a local check or two-minute monitor:

```bash
node scripts/ai-path-readiness.mjs
```

Machine-readable status for CI or change detection:

```bash
node scripts/ai-path-readiness.mjs --json
```

Release enforcement, which fails until every production condition is represented and satisfied:

```bash
node scripts/ai-path-readiness.mjs --require-production
```

Exit codes are deliberately narrow:

- `0`: the source safety invariants are intact; incomplete inventories and external production blockers are reported without breaking the ordinary monitor.
- `1`: a required safety latch is missing or no longer exactly `false as const`, or the public Realtime route contains a direct live-network call surface.
- `2`: `--require-production` was requested and production readiness is not proven.

## What it checks

The source-only inventory covers the private-alpha UI, routes, their high-risk runtime and persistence implementations, plans, migrations, tests, and operating documentation. Safety inspection recognizes these explicit code gates:

- durable assessment sessions;
- trusted durable report writer;
- durable learning-plan persistence, when present;
- durable learning-plan Supabase gateway, when present;
- production analytics sink;
- durable retention mutation job;
- durable Supabase retention gateway, when present;
- public paid Realtime bootstrap;
- authenticated owner-to-intent-to-reservation Realtime bootstrap assembly;
- Realtime production admission store, when present;
- Realtime admission policy rollout, when present;
- durable Realtime admission Supabase gateway, when present;
- Realtime admission lifecycle-maintenance gateway, when present;
- direct `fetch`, OpenAI URL, or live-call invocation in the public Realtime session route.
- provider credential, OpenAI URL, `fetch`, or live-call invocation in the authenticated preparation boundary.

Optional plan, plan-gateway, retention-gateway, admission, admission-policy,
durable-admission, and admission-maintenance modules are reported as
`not_present` when absent. If present, their latch must be one exact
literal-false export. Commented declarations, environment-derived expressions,
`true`, or duplicate declarations fail closed.

The actionable production blockers separate unfinished application/platform
engineering from operator configuration and approval. Dormant durable plan
request-runtime selection, the provider-free authenticated Realtime preparation
boundary, and disposable PostgreSQL database-owned continuity/policy contracts
are complete. Remaining engineering work is request-scoped split-credential
staging assembly, unknown-commit and lifecycle-reconciliation proof, and
bounded-retention runtime wiring/capacity proof.
Operator and governance blockers cover production Supabase and authentication,
migration and RLS proof, trusted server credentials, retention operations,
abuse and spend controls, analytics governance, explicit paid OpenAI Realtime
approval, and deployment acceptance.

## Secret, spend, and mutation safety

The checker reads only an allowlisted set of repository source paths. It does not:

- read `.env` files or inspect environment variables;
- print credential or secret values;
- launch child processes;
- make network or paid API calls;
- create, modify, or delete project files.

It therefore cannot attest that credentials, hosted infrastructure, scheduled jobs, vendor governance, or production monitoring are correct. Those require explicit operator evidence and a reviewed change to the readiness policy.

## Two-minute monitor integration

On each two-minute tick, run the JSON form and compare only material fields with the preceding report:

- `safePrivateAlpha` and `productionReady`;
- `safety.checks[*].status`;
- missing inventory paths;
- external blocker identifiers.

Report a change only when one of those values changes. A monitor must not flip a latch, provision infrastructure, inspect secrets, enable a paid service, or call OpenAI. A safety regression is actionable immediately; an unchanged external blocker is not a new event.

## CI integration

Use the default command as the safety job during active development. Continue running the project test, lint, type, build, browser, migration, and security suites separately; this presence-and-literal checker is not a substitute for them.

Reserve `--require-production` for a release gate. Before production can pass, a reviewed implementation must replace the static external-blocker policy with auditable, non-secret attestations while preserving fail-closed behavior. Any deliberate production activation also requires updating the expected latch policy in reviewed code, after the corresponding infrastructure, security, privacy, and spend approvals exist.
