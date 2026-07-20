# Semantic latch and side-effect gate

Status: deterministic source-safety gate. It opens no capability and performs no
credential, environment, network, provider, database, or filesystem mutation.

The ordinary readiness inventory verifies that reviewed production latches are
literal `false as const` declarations. That is necessary but not sufficient: a
constant can remain visibly false while sensitive code ignores it. The semantic
gate therefore verifies how each latch controls its associated effect.

Run it from any working directory:

```bash
node scripts/ai-path-semantic-latch-gate.mjs
node scripts/ai-path-semantic-latch-gate.mjs --json
```

A safe result is `LOCKED_SIDE_EFFECTS_VERIFIED`. Any missing source, malformed or
duplicate latch declaration, missing guarded function, decorative latch,
credential read before a guard, client construction before a guard, unguarded
mutation/provider effect, or route-to-runtime binding bypass produces
`BROKEN_SEMANTIC_LATCH_INVARIANT` and exit code `1`.

## Checked semantics

The gate parses TypeScript with the repository-pinned compiler and checks three
forms of control:

1. **Terminating guards.** Every required negative latch term must appear in one
   `if` condition whose guarded branch returns or throws. Credential reads,
   client construction, RPC adapters, durable service construction, admission
   mutations, and provider calls must occur after that guard.
2. **Positive activation branches.** A production-ready return may occur only
   inside the branch whose condition contains the reviewed latch. This covers
   the durable plan capability without treating its explicit non-production
   memory mode as a sensitive effect.
3. **Route binding.** When a route passes a code-level decision into a dormant
   runtime, the exact literal-false constant must be the call argument. Replacing
   it with `true` or an unrelated value fails the gate.

The current 19-contract set covers durable assessment activation, trusted
analysis transition/report writers/request runtime, durable plan activation and
its Supabase gateway, governed analytics capability and service construction,
distributed rate-limit activation and store construction, retention
route/runtime/gateway, public Realtime provider calls, Realtime admission
capability, request-scoped split-credential assembly, lifecycle cancel/finalize,
admission RPC service, and admission maintenance.

## Fail-closed maintenance rule

Adding, moving, renaming, or rewiring a production latch or sensitive effect
requires updating the semantic contract and its adversarial fixture tests in the
same change. Do not weaken a token, remove a contract, or replace a terminating
guard merely to make the report green. A new provider, credential, network,
database mutation, or client-construction surface must be added to the gate
before it can be considered source-ready.

This is a local architecture invariant, not deployment or staging proof. It does
not attest credentials, hosted authentication, RLS behavior, rate-limit stores,
provider behavior, monitoring, approvals, rollback, or paid-use authorization.
All literal latches remain closed after a successful run.
