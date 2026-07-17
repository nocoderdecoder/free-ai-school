# Dormant Supabase retention adapter

The Supabase retention transport and dormant cron runtime assembly are
implemented. The cron route now selects that assembly, but cannot reach its
credential or network path while either literal code gate remains closed. The
gateway has an independent literal code gate:

```ts
AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH = false as const
```

The existing route-level `AI_PATH_RETENTION_JOB_READY` gate also remains
`false`. The assembly checks both latches before reading the service credential
or constructing a client. Enabling environment variables, supplying
credentials, or applying migrations cannot cross either boundary.

## Narrow transport contract

The server-only factory accepts an already-created Supabase client and never reads or logs a credential. Its client surface is narrowed to two RPCs that each require an integer `p_limit`:

- `purge_expired_ai_path_learning_plans`
- `purge_expired_ai_path_sessions`

Plans run first. If that call fails, sessions are not attempted. If plans succeed and sessions fail, the cycle reports a content-free session-target failure and stops; a retry is safe because both SQL deletes are idempotent and session deletion cascades derived plans.

The assembly pins the reviewed maximum batch and the 20-second per-target
application deadline. Neither value can come from the scheduler request or an
environment variable. The deadline bounds each target separately; a successful
plan purge followed by a session timeout remains an explicit partial cycle and
is safe to retry.

Migration `20260717060000_ai_path_bounded_retention.sql` replaces the legacy delete-all functions with ordered, row-locked batches. The application passes the same reviewed ceiling into Postgres before deletion, and the SQL rejects null or out-of-range bounds before touching rows. Returned counts are still treated as untrusted and revalidated. Provider codes, error messages, row bodies, transcript content, check-in content, credentials, and request bodies are never returned or placed in operational events.

## Authorization boundary

The bounded migration revokes purge execution from `public`, `anon`, and `authenticated`, grants it only to `service_role`, and rechecks the JWT role inside each security-definer function. The future factory additionally requires an explicit `credentialScope: 'service-role'` activation attestation, but it cannot introspect or prove the JWT role. Database grants are authoritative. The factory must remain server-only and must never accept a user-provided Supabase client.

## Activation remains blocked

Before any route wiring or latch change:

1. apply all migrations through `20260717060000` to a disposable Supabase project;
2. run real role tests proving anon/authenticated rejection and service-role success;
3. test zero, exact-limit, backlog-over-limit, concurrent `skip locked`, timeout, retry, and plan-success/session-failure cases with synthetic rows;
4. capacity-test the selected maximum batch size and scheduler cadence;
5. configure secret rotation, scheduler authentication, alerting, deletion-latency monitoring, and rollback;
6. require reviewed approval for both latch changes already tracked by the central readiness policy.

This checkpoint performs no migration, credential read, client construction,
database connection, scheduler activation, or paid call because both literal
code latches remain closed.
