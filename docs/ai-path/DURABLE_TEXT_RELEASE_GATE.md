# Authenticated durable text release gate

`scripts/ai-path-durable-text-gate.mjs` is the fail-closed, offline evidence gate
for authenticated durable **text** assessment sessions. It does not authorize
voice, OpenAI Realtime, analytics, durable learning plans, or any paid call.
It never opens a source latch. A complete packet changes only the report from
`CLOSED_EVIDENCE_MISSING` to `READY_FOR_REVIEWED_ACTIVATION`; a separately
reviewed source change and deployment change control would still be required.
It reads only the named source/evidence files, never environment variables or
credential stores, never prints evidence content, and rejects common secret
patterns.

## Current result

```bash
node scripts/ai-path-durable-text-gate.mjs
```

The repository intentionally reports `CLOSED_EVIDENCE_MISSING`. The assessment,
trusted-writer, retention-job, and retention-gateway latches must each remain one
literal `false as const` export while this pre-activation gate is evaluated.
Credentials and environment variables are never evidence.

Release enforcement is explicit:

```bash
node scripts/ai-path-durable-text-gate.mjs \
  --evidence-dir /absolute/path/to/content-free-evidence \
  --release-commit 0123456789abcdef0123456789abcdef01234567 \
  --require-ready
```

Exit `0` means the packet is ready for a reviewed activation decision. Exit `1`
means a source safety invariant is broken. Exit `2` means evidence is absent or
invalid. Exit `64` means the invocation is invalid. Without `--require-ready`,
missing evidence is a normal closed state and exits `0`.

## Exact evidence packet

Keep the packet outside the repository. Every file must be a regular,
non-symlink file. JSON files are limited to 64 KiB and logs to 4 MiB. Raw cookie
headers, bearer tokens, service keys, password-bearing database URLs, prompts,
answers, transcripts, and other user content are prohibited.

The directory contains:

```text
evidence-index.json
database-proof.json
database-proof.log
auth-proof.json
auth-proof.log
retention-proof.json
retention-proof.log
export-delete-proof.json
export-delete-proof.log
ci-proof.json
ci-run.json
```

All five proof documents use `schemaVersion: 1`, `result: "pass"`, the same
lowercase 40-character `releaseCommit`, the required `checks` below, and an
`artifact` object with the exact allowed filename and its lowercase SHA-256.
The gate verifies the bytes, not filenames alone.

| Document | Required metadata | Required checks |
| --- | --- | --- |
| `database-proof.json` | `kind: disposable_postgresql_behavioral_proof`; PostgreSQL major `>=15`; migration count `>=8`; harness `scripts/ai-path-db-proof.sh`; artifact `database-proof.log` | `migrations-applied`, `rls-owner-isolation`, `trusted-writer-binding`, `bounded-retention`, `owner-export-delete`, `account-and-source-cascade`, `rollback-clean` |
| `auth-proof.json` | `kind: authenticated_text_session_configuration_proof`; provider `supabase`; transport `http-only-cookie`; artifact `auth-proof.log` | `verified-principal`, `http-only-cookie`, `same-site-cookie`, `secure-cookie-in-production`, `owner-a-access`, `owner-b-denied`, `unauthenticated-denied`, `server-only-service-credential` |
| `retention-proof.json` | `kind: retention_operations_proof`; `policyDays: 90`; current `docs/ai-path/RETENTION_OPERATIONS.md` SHA-256; artifact `retention-proof.log` | `bounded-90-day-purge`, `owner-hard-delete`, `account-cascade`, `source-session-cascade`, `idempotent-retry`, `scheduler-auth`, `backup-retention-reviewed`, `deletion-latency-alert` |
| `export-delete-proof.json` | `kind: assessment_session_export_delete_proof`; resource `assessment-session`; artifact `export-delete-proof.log` | `owner-export`, `cross-owner-export-denied`, `owner-hard-delete`, `cross-owner-delete-denied`, `post-delete-not-found`, `account-cascade` |
| `ci-proof.json` | `kind: github_actions_release_proof`; workflow file `.github/workflows/ai-path-db-proof.yml`; successful run ID/URL; exact artifact name `ai-path-db-proof-<runId>`; artifact `database-proof.log`; hashed `ci-run.json` binding | `workflow-conclusion-success`, `database-proof-job-success`, `source-tests-success` |

Each log must contain one exact content-free success marker:

```text
[ai-path-db-proof] PASS: <count> migrations and all disposable database contracts succeeded
PASS: authenticated durable text configuration contracts succeeded
PASS: durable text retention operations contracts succeeded
PASS: assessment session export and delete contracts succeeded
```

The database marker's count must equal `database-proof.json.migrationCount`.
The other three markers come from the reviewed staging verification commands;
they are not assertions to add manually after a failed run.

## GitHub CI and commit binding

Use the `AI Path disposable PostgreSQL proof` workflow's uploaded
`ai-path-db-proof-<runId>` artifact. Both `database-proof.json` and
`ci-proof.json` bind the downloaded `database-proof.log` SHA-256. Export the
run metadata without logs or secrets:

```bash
gh run view RUN_ID \
  --json conclusion,databaseId,event,headSha,url,workflowName \
  > ci-run.json
```

`ci-proof.json.runMetadata` binds `ci-run.json` by SHA-256. The gate parses that
file and requires: the same run ID and URL, conclusion `success`, workflow name
`AI Path disposable PostgreSQL proof`, and `headSha` equal to every document's
`releaseCommit`. Only a `push` or `workflow_dispatch` run is accepted for final
evidence; a pull-request merge-ref run is not sufficient commit identity.

The workflow currently proves PostgreSQL behavior but does not create the four
operator attestations. Platform/security must separately run authenticated
staging tests, retention operations tests, and owner/cross-owner export/delete
tests without real user data. Local absence of `psql` is not bypass authority;
the disposable GitHub PostgreSQL 16 job is the expected database proof.

## Evidence index and approvals

`evidence-index.json` has this shape:

```json
{
  "schemaVersion": 1,
  "gateVersion": "2026-07-17.v1",
  "releaseCommit": "0123456789abcdef0123456789abcdef01234567",
  "approvals": [
    { "role": "platform", "decision": "approved", "reference": "https://change-system.example/P-1" },
    { "role": "privacy", "decision": "approved", "reference": "https://change-system.example/P-2" },
    { "role": "release", "decision": "approved", "reference": "https://change-system.example/P-3" },
    { "role": "security", "decision": "approved", "reference": "https://change-system.example/P-4" }
  ],
  "documents": {
    "database-proof.json": "<sha256>",
    "auth-proof.json": "<sha256>",
    "retention-proof.json": "<sha256>",
    "export-delete-proof.json": "<sha256>",
    "ci-proof.json": "<sha256>"
  }
}
```

Approval references must point to the organization's durable change records;
the gate checks structure and integrity but cannot authenticate the referenced
system offline. The release reviewer must verify those references before any
latch change.

## What a ready result still does not prove

A ready packet does not configure Supabase, scheduler credentials, backups,
monitoring, distributed rate limits, deployment, DNS, or rollback. It does not
make authentication available in production and cannot prove a hosted system
has the same configuration after deployment. Those remain release-owner
checks. Paid Realtime remains independently locked and out of scope.
