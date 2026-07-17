# AI Path Plan Loop

## Purpose and current boundary

The plan-loop foundation turns an assessment result into an owner-scoped, versioned 30-day plan. It is implemented as a pure TypeScript domain service with a deterministic in-memory test adapter and a Supabase migration. No external database, model, storage, or paid service is activated by this slice.

The application UI may use a local browser fallback before authenticated persistence is configured. That fallback must remain visibly local and must not claim cross-device durability.

## Aggregate and ownership

An `ai_path_learning_plans` row is the aggregate root. Every read or mutation is scoped to the verified owner. The initial snapshot points to one completed assessment session. A reassessment appends another immutable snapshot linked to the new completed assessment session; it does not rewrite the earlier plan.

Each snapshot has exactly 12 tasks: three ordered task positions for each of four weeks. Task progress is stored separately by snapshot version so previous snapshots and their progress remain inspectable. A revision counter gives every mutation optimistic concurrency protection.

The aggregate includes:

- immutable plan snapshots with initial, adaptation, or reassessment provenance;
- current-snapshot task progress;
- owner-written weekly text check-ins;
- explicit time-budget changes with source and reason;
- proposed adaptations and their approval decisions;
- the complete version and decision history needed for export.

## State and mutation rules

Task progress allows only these transitions:

- `pending` to `in_progress`, `completed`, or `skipped`;
- `in_progress` to `completed` or `skipped`;
- `skipped` to `pending` when the learner explicitly restarts it;
- `completed` is terminal.

Completed or archived plans are immutable through the bounded mutation RPCs. A stale revision fails rather than overwriting a newer learner action.

Check-ins accept 1–2,000 characters and one record per numbered week. Weekly time is an integer from 15–1,200 minutes. An adaptation may contain one time adjustment and at most three task swaps. Completed tasks cannot be swapped.

An adaptation remains `proposed` until the learner explicitly approves or rejects it. Proposing an adaptation never changes tasks, progress, or time. Approval creates a new immutable snapshot, carries unchanged task progress forward, resets replacements to pending, and records any time change. Rejection changes only the proposal decision. A new reassessment supersedes any still-pending proposal.

## Database authority boundary

Authenticated users receive `select` on owner-scoped rows through RLS, but no direct table insert, update, or delete grants. User actions run through bounded functions that derive ownership from `auth.uid()`, lock the aggregate, enforce the revision, and validate the state transition.

Forgery-sensitive operations are service-role-only:

- initial plan generation;
- adaptation proposal generation;
- reassessment snapshot generation;
- retention purge.

The service role is restricted to trusted server jobs and must never be exposed to a browser or accepted from a user-controlled route. The learner alone approves or rejects a proposal through the authenticated owner RPC.

## HTTP and activation boundary

The plan API has bounded routes for create/read, task progress, time budget, weekly check-in, adaptation approval/rejection, export, and hard delete. Every operation requires a verified principal. Durable identifiers must be UUIDs; cookie-authenticated mutations also require an exact same-origin `Origin`. Revision-bearing mutations return a conflict instead of overwriting newer state.

Plan creation first verifies an owned completed assessment report. Repeating the same create request resumes the existing plan; changing its initial goal preference or time budget returns a conflict. In-memory persistence requires exact `test` or `development` mode plus explicit plan-store, assessment-store, and test-auth flags. Production capability and Supabase gateway construction each remain behind literal-false code latches, so environment flags cannot initiate database traffic.

The plan routes now have a complete dormant request-runtime selection path. A future durable request must pass the plan capability latch, the assessment-session persistence capability, and the independent plan-gateway latch before the runtime authenticates the request, reads the server-only service credential, or constructs a Supabase client. The owner-scoped user client performs reads and learner mutations; a separately constructed server-only client is narrowed by the adapter to initial plan creation. Exact schema, service-role readiness, and the `authenticated-user+service-role` credential-scope attestation are all required. A construction failure returns the generic disabled runtime, never falls back to process memory, and never exposes configuration, authentication, or database details.

Both production latches remain exactly `false as const`. This source wiring is not authorization to configure a credential, deploy durable mode, or run a hosted test.

The currently submitted `goalType` is a bounded learner preference used to select one server-owned blueprint. It is not assessment evidence and must not be described as an inferred outcome. Before durable activation, persist and bind that preference server-side when the assessment session is created, then derive plan selection from the trusted binding. Until that shared-session schema change is reviewed, the durable plan latch must remain closed.

## Retention, export, and deletion

Assessment sessions, saved reports, and their derived plan-loop records default to the same 90-day retention window. This matches the required source-session relationship and the product disclosure. Account or session deletion cascades immediately rather than waiting for the retention job.

Deletion behavior is immediate when requested:

- deleting the account cascades from `auth.users` through plans and every plan child;
- deleting any assessment session used by the initial plan or a reassessment deletes the derived plan and its check-ins, snapshots, progress, proposals, and history;
- owner plan deletion is immediate and cascade-backed;
- a service-only purge removes plans when their retention deadline is reached;
- owner export includes snapshots, progress, check-ins, adaptation decisions, and budget history.

Weekly check-in text is private product content. It may appear in the learner's owner-scoped plan export, but must never be copied into analytics, event properties, logs, traces, error messages, or operational telemetry. Analytics may emit content-free events such as `plan_check_in_submitted` with plan/version identifiers that are non-secret and appropriately pseudonymized.

## Verification status

Pure service tests cover task shape, owner isolation, defensive copies, duplicate source-session prevention, strict task transitions, stale revisions, immutable terminal plans, check-ins, time changes, proposal approval/rejection, bounded swaps, reassessment history, export, delete, and retention purge. Request-runtime tests additionally prove dormant durable selection, no memory fallback, split-credential attestation, and capability checks occurring before server credential access or client construction.

Static SQL contract tests cover RLS, table grants, service-only generation functions, authenticated owner RPCs, terminal immutability, 12-task checks, approval gates, delete cascades, aligned retention, and private check-in analytics exclusion.

The checked-in disposable PostgreSQL 16 suite now proves the full eight-migration chain, including policy behavior, RPC concurrency, cascading deletes, rollback boundaries, retention, and export/delete contracts. Before production activation, repeat the authenticated-user portions against an isolated Supabase-compatible staging project with two verified users plus the service role, then bind that evidence to the exact release commit. Passing the disposable proof is not authority to enable a paid service automatically.
