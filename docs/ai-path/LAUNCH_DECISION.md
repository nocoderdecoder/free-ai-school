# Consolidated launch decision

`scripts/ai-path-launch-decision.mjs` is the final fail-closed, offline decision
surface for AI Path. It combines source safety and inventory, durable-text
release evidence, research-session readiness, browser/accessibility acceptance,
and the independently locked Realtime, analytics, paid-service, and production
release decisions into ten explicit gates.

```bash
node scripts/ai-path-launch-decision.mjs
```

The default result is expected to be
`PRIVATE_ALPHA_SOURCE_READY_EVIDENCE_REQUIRED`: the repository may be ready for
a local private-alpha workflow while commit-bound research and cross-browser
evidence are still absent. Production always remains locked until reviewed
external infrastructure, governance, spend, launch, and rollback decisions are
supplied through their own change controls.

The research manifest is a commit-bound **pre-session readiness** assertion, not
proof that a study occurred. Browser/accessibility acceptance is stronger: the
decision requires the manifest commit to match `--release-commit` and verifies
every referenced repository artifact as a bounded regular non-symlink file with
an exact SHA-256 binding. Hand-authored paths or pass strings alone cannot make
that gate ready.

For a release candidate, bind all offline evidence explicitly:

```bash
node scripts/ai-path-launch-decision.mjs \
  --release-commit 0123456789abcdef0123456789abcdef01234567 \
  --evidence-dir /absolute/path/durable-text-evidence \
  --research-manifest /absolute/path/research-readiness.json \
  --acceptance-evidence /absolute/path/private-alpha-acceptance.json \
  --require-private-alpha-evidence
```

Exit `0` means source safety passes and any requested evidence level is met.
Exit `1` means source safety or inventory is broken. Exit `2` means requested
private-alpha evidence is absent or invalid. Exit `3` means production was
requested but remains locked. Exit `64` means the invocation is invalid.

The decision reads no environment variables, secrets, or credentials; starts no
subprocess; makes no network call; mutates no workspace; opens no latch; and
authorizes no paid call. A green evidence report is review input, never an
activation command.
