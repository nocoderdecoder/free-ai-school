# AI Path disposable database proof

This runbook behaviorally validates every AI Path migration against an empty,
disposable, loopback-local PostgreSQL database. It requires the established
migrations as a baseline and automatically includes later `*_ai_path_*.sql`
migrations in filename/version order. It is an engineering proof, not a
production migration procedure.

The harness never installs or starts PostgreSQL, creates or drops a database,
connects to a remote host, activates an application latch, or calls a paid
service. It deliberately leaves the proof database intact for inspection.

## Prerequisites

- PostgreSQL 15 or newer and `psql` are already available locally.
- The server belongs to a dedicated disposable development cluster.
- The cluster already has Supabase-compatible `anon`, `authenticated`, and
  `service_role` roles. The harness will not create cluster-global roles.
- The `pgcrypto` extension is available to the connecting superuser.
- An empty database named `ai_path_proof_<suffix>` exists on that cluster.
  Do not point the harness at the normal local development database.
- The URL uses `postgresql://` and a literal `localhost`, `127.0.0.1`, or `::1`
  host. Socket URLs, remote URLs, and URI query parameters that could override
  connection coordinates are intentionally rejected.
- The URL must not contain a password, and `PGPASSWORD` must be unset. Use a
  protected `PGPASSFILE` (mode `0600`) or a passwordless dedicated local proof
  role so cluster credentials never appear in process arguments.

If a prerequisite is absent, provision it separately using the team's approved
local database workflow. The harness will report the missing prerequisite and
exit without installing, starting, creating, or dropping anything.

Run the non-connecting source preflight on any machine:

```bash
node scripts/ai-path-db-proof-preflight.mjs --source-only --json
```

Run the runtime-required preflight before preparing a local database:

```bash
node scripts/ai-path-db-proof-preflight.mjs --json
```

It exits `2` when `psql` is absent, unreadable, or older than PostgreSQL 15.
Neither mode reads a database URL or opens a connection.

## Ephemeral CI proof

`.github/workflows/ai-path-db-proof.yml` runs the same behavioral harness on a
fresh PostgreSQL 16 service for relevant pull requests, pushes to `main`, or a
manual dispatch. The workflow has read-only repository permissions, uses no
secrets, exposes PostgreSQL only through the runner's loopback port, creates the
three compatibility roles and reserved `ai_path_proof_ci` database only inside
that disposable service, and uploads the proof log for 14 days. The service is
destroyed with the job.

The CI bootstrap is intentionally separate from the behavioral harness. The
workflow connects through runner loopback, while PostgreSQL can report its
server-side Docker bridge address. The bootstrap therefore accepts only
loopback or RFC1918 private service networks and refuses a non-`postgres`
maintenance database, an unexpected user, an existing proof database, or
pre-existing compatibility roles. It also requires a CI-specific
disposable-cluster confirmation distinct from the harness confirmation. It
contains no drop operation and cannot activate application latches.

After a successful behavioral proof, the workflow runs
`scripts/ai-path-db-proof-evidence.mjs --candidate`. The uploaded artifact then
contains the proof log, its SHA-256-bound database proof document, a content-free
run candidate, and a digest manifest. This in-workflow bundle is always marked
`validation-only`: the workflow cannot truthfully attest its own final
conclusion before it has completed. A pull-request run is additionally marked
as unable to prove the exact release commit.

After an accepted `push` or `workflow_dispatch` run has completed successfully,
an operator can export authoritative public run metadata and deterministically
finalize the two database/CI proof documents without reading credentials or
calling a network from the generator:

```bash
gh run view RUN_ID \
  --json conclusion,databaseId,event,headSha,url,workflowName \
  > /protected/evidence/ci-run-source.json

node scripts/ai-path-db-proof-evidence.mjs \
  --proof-log /protected/evidence/database-proof.log \
  --postgres-major 16 \
  --run-metadata /protected/evidence/ci-run-source.json \
  --candidate-manifest /protected/evidence/database-proof-evidence-manifest.json \
  --out-dir /protected/evidence/finalized
```

The finalizer normalizes and hashes `ci-run.json`, `database-proof.json`, and
`ci-proof.json`. It accepts only a completed successful run of this exact
workflow and binds every document to the run's lowercase 40-character head SHA.
It also requires the candidate manifest from that run's downloaded artifact and
verifies its proof-log, database-document, and candidate-run digests before
finalizing anything.
It can process a successful pull-request run for validation archives, but marks
it `validation-only`; the durable-text gate independently rejects that event.
The manifest remains `gatePacketComplete: false` because auth, retention,
export/delete, approvals, and the evidence index are separate operator proofs.

## Run

From the repository root:

```bash
AI_PATH_DB_PROOF_DISPOSABLE=I_UNDERSTAND_THIS_DATABASE_WILL_BE_MUTATED \
PGPASSFILE='/protected/path/to/proof.pgpass' \
AI_PATH_DB_PROOF_URL='postgresql://LOCAL_USER@127.0.0.1:5432/ai_path_proof_20260717' \
scripts/ai-path-db-proof.sh
```

The explicit confirmation is required on every run. The harness then performs
a read-only preflight and refuses the target unless all of these are true:

1. The parsed URL is loopback-only and the connected server reports loopback or
   an RFC1918 private service-network address.
2. The connected database name is exactly the reserved `ai_path_proof_*` name.
3. The database has no user relations, functions, custom schemas, non-default
   extensions, or public enum/domain/composite types.
4. PostgreSQL is version 15 or newer.
5. The connection is a superuser on the dedicated disposable cluster.
6. All three Supabase roles already exist.

After preflight it creates only database-local auth compatibility objects,
applies every discovered AI Path migration one at a time, and runs the proof
suite.

## Proof coverage

- Every migration applies successfully in the expected order.
- Final tables, RLS flags, forced RLS on the paid-admission ledger, RPC
  signatures, and role grants exist.
- Migration `20260717080000` refuses a non-empty legacy admission ledger before
  replacing opaque HMAC keys with database-owned continuity UUIDs.
- Anonymous, authenticated, and service-role direct accesses that should be
  unavailable fail in separate connections.
- Each authenticated owner sees only its own assessment and cannot export or
  delete another owner's assessment.
- Goal binding is immutable.
- Session and plan retention reject an invalid zero limit and delete no more
  than the requested batch size.
- Only an authenticated owner can issue a short-lived intent for an owned
  `consented` or `connecting` assessment session. Anonymous and service-role
  issuance are denied, and no continuity identifier is returned.
- Private owner/session continuity mappings are stable across intent retry,
  forced-RLS, and unavailable through direct authenticated or service-role
  table access.
- Service-only reservation consumes an authenticated intent, replays the same
  idempotency key, and denies a changed request that reuses the intent/key.
- Direct source-session and `auth.users` deletion are rejected while an
  unexpired lease exists. After database-time expiry, direct account deletion
  transitions the lease, cascades every raw mapping/intent, and leaves only the
  pseudonymous intent-bound ledger capability for seven-day reconciliation.
- Caller-supplied caps, TTLs, clocks, opaque HMAC keys, and old RPC overloads are
  absent. The database policy identifier, disabled state, caps, and lease TTL
  are authoritative.
- Realtime late finalization succeeds inside the fixed seven-day reconciliation
  window and fails outside it.
- Admission maintenance transitions expired leases and purges terminal detail
  in caller-bounded batches, never purges the current UTC day, and atomically
  preserves content-free accounting totals in the forced-RLS daily archive.
- Two simultaneous service connections consume independently authenticated
  intents while contending for one database-owned global Realtime slot;
  exactly one reserves it and the other receives
  `global_concurrency_exceeded`.

The application RPC deadline is four seconds. The proof also inspects the
database function timeout ceiling, which must remain below that deadline. A
timeout is still an unknown commit: callers make zero provider requests and
retry the same intent/idempotency key to discover the one durable result.

Success ends with:

```text
PASS: <count> migrations and all disposable database contracts succeeded
```

## Evidence and cleanup

Keep the complete terminal output as the migration proof artifact. Record the
PostgreSQL version and migration commit SHA alongside it.

Inspect the disposable database if a check fails. When evidence collection is
finished, remove the database using the team's trusted local database tooling
and an independently verified exact database name. Cleanup is intentionally
outside this harness so a test script never receives drop authority.

Passing this suite proves behavior on the tested local PostgreSQL version. It
does not activate the dormant durable adapters, retention job, or paid Realtime
path, and it does not replace staging migration review, backup/restore proof, or
production change control.
