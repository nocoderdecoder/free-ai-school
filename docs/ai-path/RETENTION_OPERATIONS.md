# AI Path retention operations

Assessment sessions, immutable reports, saved plans, check-ins, adaptations, and reassessment snapshots use one disclosed 90-day default. Account deletion, owner-requested deletion, or source-session deletion cascades immediately and does not wait for the scheduled purge.

## Dormant job boundary

`POST /api/cron/ai-path-retention` is implemented but held behind the literal `AI_PATH_RETENTION_JOB_READY = false` code gate. Environment variables cannot activate it. The future scheduler must present a dedicated secret of at least 24 characters; the route accepts no body and returns only opaque run IDs and per-table delete counts.

The retention service purges expired plan records first, then sessions. Both operations must be idempotent because a retry can follow a partial failure, and session deletion can cascade already-expired plans. Operational events contain only the target name, delete count, opaque run ID, time, and bounded error code—never transcript, check-in, goal, role, report narrative, or database error text.

## Activation checklist

1. Apply and attest the assessment, plan, and trusted-writer migrations in a disposable Supabase environment.
2. Prove owner hard-delete, account cascade, source-session cascade, and 90-day purge with two users plus service role.
3. Implement the server-only purge adapter without placing a service credential in user routes or logs.
4. Configure a monitored scheduler, a dedicated secret, retry policy, timeout, and alert on any target failure.
5. Document database backup retention and confirm it matches the public deletion promise.
6. Run a dry audit with synthetic records, then change the literal code gate in a reviewed release.

No scheduler, migration, database, or paid service is activated by this repository checkpoint.
