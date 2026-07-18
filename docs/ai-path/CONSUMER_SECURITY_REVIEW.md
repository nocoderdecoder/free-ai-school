# AI Path consumer security review

Reviewed: 2026-07-18
Launch decision: **NO-GO for public consumers** until the blocking items below have staging evidence.

This review covers the consumer-facing AI Path diagnostic, authentication foundation, server result boundary, Supabase persistence foundations, rate limiting, paid-provider gates, privacy operations, dependencies, and deployment checks. It follows the official [Next.js authentication](https://nextjs.org/docs/app/guides/authentication), [Next.js data security](https://nextjs.org/docs/app/guides/data-security), [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist), [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod), [Supabase security guidance](https://supabase.com/docs/guides/security/product-security), and OWASP [authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html), [session](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html), and [REST security](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html) guidance.

## Implemented in this hardening pass

- Patched Next.js and its ESLint configuration from 16.2.3 to 16.2.10.
- Moved current diagnostic result generation behind a strict server endpoint. The browser no longer owns the authoritative recommendation.
- Added exact, bounded, version-pinned parsing for both current diagnostic paths, same-origin enforcement, JSON-only requests, no-store responses, and HTTPS-only optional artifact URLs.
- Added a dormant Supabase SSR passwordless-auth foundation with verified `getUser()` identity checks, secure cookies, allowlisted return paths, POST-only sign-out, exact-origin checks, and generic errors.
- Added layered sign-in abuse policies for source IP, normalized email, and callback exchange. Production sign-in fails closed until distributed limiting is proven and enabled.
- Added a content-free, salted-identity, Postgres-backed atomic rate-limit migration and application adapter. Browser roles cannot call the RPC or read the counters.
- Added database proof coverage for role denial, counter reset, multi-identity consumption, and over-limit denial.
- Added dormant owner-scoped storage for the current two-path diagnostic with immutable intake/result digests, idempotency, consent versions, 90-day retention bounds, RLS, and export/delete RPCs.
- Connected optional account saving to the server result route with explicit versioned consent, verified ownership, and a retry-stable completion key. Saving remains unavailable until hosted proof opens the persistence latch; unsaved results continue to work.
- Added dormant full-account export/deletion orchestration. Destructive deletion remains impossible until a one-time reauthentication ceremony is bound to the current session, analytics erasure is assembled, and both code latches are reviewed open.
- Added a minimal account page for export, sign-out, and an honestly disabled delete action.
- Pinned answer-aware question phrasing to `gpt-5.6-luna` with no reasoning effort, a 100-token maximum, strict Structured Outputs, `store: false`, verified users, rate limiting, and an environment opt-in. No provider request was made in this pass.
- Added an enforced AI Path CSP, HSTS, COOP, existing anti-framing/MIME/referrer/resource policies, and a blocking application CI workflow.
- Kept hosted persistence, adaptive-model traffic, Realtime voice, retention jobs, and every unproven production capability closed.

## Blocking findings

### AP-SEC-001 — Current diagnostic persistence lacks hosted proof

- Severity: High
- Evidence: explicit versioned storage consent and authenticated server wiring now exist, but the persistence latch remains closed until its database contracts run against disposable and hosted databases.
- Risk: users cannot yet save or resume a plan across devices in a deployed environment.
- Required fix: execute the checked-in two-user, idempotency, immutability, retention, export, and deletion proofs in disposable and hosted staging databases; then review the exact-commit latch change.
- Temporary mitigation: results remain ephemeral and deterministic; do not advertise account history or open persistence.

### AP-SEC-002 — Consumer authentication is source-ready but not deployed

- Severity: High
- Evidence: auth is gated by `AI_PATH_CONSUMER_AUTH_ENABLED`, a reviewed HTTPS origin, and Supabase public configuration. No hosted auth evidence exists.
- Risk: a public launch has no verified account ownership, email-delivery proof, recovery rehearsal, or abuse evidence.
- Required fix: provision the reviewed Supabase project, exact callback URL, branded email delivery, provider OTP limits, staging users, logout/session-expiry tests, and production-domain proof.
- Temporary mitigation: keep the auth flag disabled and do not expose saved/paid features.

### AP-SEC-003 — Distributed rate limiting is implemented but deliberately locked

- Severity: High
- Evidence: both code-owned latches in `rate-limit.ts` and `rate-limit-runtime.server.ts` are false.
- Risk: opening public or paid endpoints without a multi-instance limit can permit bot traffic, email abuse, and provider-spend exhaustion.
- Required fix: run the disposable DB proof and hosted concurrency proof; review trusted proxy hops; provision a 32+ character identity salt; verify rollback; then open one reviewed latch at a time.
- Temporary mitigation: production routes fail closed with 503; development uses a bounded process-local limiter.

### AP-SEC-004 — Account privacy fulfillment is incomplete

- Severity: High
- Evidence: a dormant full-account export/delete foundation and minimal account UI now exist, but export and deletion remain disabled; there is no session-bound reauthentication ceremony or production analytics deletion connector.
- Risk: consumers cannot exercise complete account access and erasure through the product.
- Required fix: add a one-time reauthentication proof bound to the exact current session, deletion confirmation/audit receipt, analytics erasure connector, and end-to-end cascade proof.
- Temporary mitigation: do not claim self-service account deletion at launch.

### AP-SEC-005 — Retention is not operational

- Severity: High
- Evidence: 90-day expiries and bounded purge RPCs exist, while the retention scheduler and gateway remain disabled.
- Risk: logically expired records can remain physically stored.
- Required fix: run the purge in staging, monitor bounded batches and failures, verify backups and restore behavior, assign an operator, and only then schedule production retention.

### AP-SEC-006 — Voice is a local microphone test, not a production conversation

- Severity: High
- Evidence: Realtime provider and admission latches remain closed; the UI currently discloses that voice-to-text is not connected.
- Risk: enabling network audio without consent, admission accounting, duration/concurrency limits, transcript policy, and provider disclosure creates privacy and spend exposure.
- Required fix: add just-in-time consent, default transcript storage off, authenticated admission, per-user/daily budgets, provider timeout, kill switch, lifecycle reconciliation, and explicit approval before paid calls.

## Important tracked debt

### AP-SEC-007 — Dependency audit is not clean

- Severity: High
- Status: Next.js high-severity advisory removed by upgrading to 16.2.10. `npm audit --omit=dev` still reports 27 transitive findings (2 low, 16 moderate, 9 high), primarily through the Sanity/tooling tree. No critical findings were observed.
- Required fix: perform package-by-package reachability review and upgrade when compatible fixes exist. Do not use a forced downgrade or breaking audit fix without regression proof.
- CI posture: critical advisories block the consumer workflow; high findings are recorded and remain a launch decision input.

### AP-SEC-008 — CSP still permits inline scripts and styles

- Severity: Medium
- Evidence: `next.config.ts` enforces same-origin resources, connections and forms and blocks objects/framing, but Next hydration currently requires inline script/style allowances.
- Required fix: replace unnecessary inline allowances with a nonce-based policy and add a redacted same-origin violation reporting pipeline.

### AP-SEC-009 — Privacy/legal/age policy is not finalized

- Severity: Medium
- Required fix: publish privacy and terms pages, identify the operator/contact, define audience/age handling, disclose Supabase/OpenAI processing, warn against secrets/sensitive work content, and document retention.

### AP-SEC-010 — Operational production evidence is missing

- Severity: Medium
- Required fix: staging exact-commit proof, log redaction checks, alerting, incident response owner, backup/restore rehearsal, domain/TLS evidence, rollback rehearsal, support contact, uptime monitoring, and cost alerts.

## Controls already strong

- Server auth uses verified identity rather than trusting cookie session claims.
- Auth cookies are HTTP-only, Secure in production, SameSite=Lax, and no-store responses carry refreshed cookies.
- Existing Supabase migrations use owner-scoped RLS, `auth.uid()` derivation, forced RLS where appropriate, constrained RPCs, and service/browser credential separation.
- Request bodies and text are bounded; authenticated mutations generally require same-origin requests.
- Provider keys remain server-only, paid capabilities fail closed, and no paid calls are made during tests.
- Rate-limit storage contains policy IDs, salted SHA-256 identity hashes, windows, and counts—never raw IPs, user IDs, answers, prompts, transcripts, or audio.

## Release rule

Do not open a capability because its environment variables exist. Each production latch requires evidence for the exact commit: authentication first, canonical durable ownership second, distributed limiter third, persistence and account controls fourth, adaptive text AI fifth, and Realtime voice last.
