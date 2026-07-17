#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export const AI_PATH_READINESS_VERSION = '2026-07-17.v1'

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const privateAlphaFiles = [
  'app/ai-path/page.tsx',
  'app/ai-path/AdvisorApp.tsx',
  'app/ai-path/ai-path.css',
  'app/ai-path/lib/foundation.ts',
  'app/ai-path/lib/plan.ts',
  'app/api/ai-path/session/route.ts',
  'app/api/ai-path/analysis/route.ts',
  'app/ai-path/foundation.test.mjs',
  'app/ai-path/route-handlers.test.mjs',
  'app/ai-path/reviewed-assessment.test.mjs',
  'app/ai-path/plan.test.mjs',
  'docs/ai-path/PRODUCT.md',
  'docs/ai-path/ARCHITECTURE.md',
  'docs/ai-path/DELIVERY.md',
]

const productionFoundationFiles = [
  'supabase/migrations/20260717000000_ai_path_assessment_sessions.sql',
  'supabase/migrations/20260717010000_ai_path_learning_plans.sql',
  'supabase/migrations/20260717020000_ai_path_trusted_report_writer.sql',
  'supabase/migrations/20260717040000_ai_path_realtime_admission.sql',
  'supabase/migrations/20260717050000_ai_path_goal_type_binding.sql',
  'supabase/migrations/20260717060000_ai_path_bounded_retention.sql',
  'supabase/migrations/20260717070000_ai_path_realtime_admission_lifecycle.sql',
  'supabase/migrations/20260717080000_ai_path_realtime_admission_continuity_policy.sql',
  'app/api/ai-path/session/[sessionId]/route.ts',
  'app/api/ai-path/plan/route.ts',
  'app/api/ai-path/plan/[planId]/route.ts',
  'app/api/ai-path/plan/[planId]/tasks/[taskId]/route.ts',
  'app/api/ai-path/plan/[planId]/check-ins/route.ts',
  'app/api/ai-path/plan/[planId]/adaptations/[adaptationId]/route.ts',
  'app/api/ai-path/plan/[planId]/export/route.ts',
  'app/api/ai-path/plan/[planId]/time-budget/route.ts',
  'app/api/ai-path/events/route.ts',
  'app/api/ai-path/realtime/session/route.ts',
  'app/api/cron/ai-path-retention/route.ts',
  'app/ai-path/lib/learning-plan-capability.ts',
  'app/ai-path/lib/goal-type.ts',
  'app/ai-path/lib/database.types.ts',
  'app/ai-path/lib/analysis-http.ts',
  'app/ai-path/lib/session-http.ts',
  'app/ai-path/lib/session-persistence.server.ts',
  'app/ai-path/lib/durable-session-runtime.server.ts',
  'app/ai-path/lib/supabase-auth.server.ts',
  'app/ai-path/lib/supabase-persistence.ts',
  'app/ai-path/lib/supabase-session-repository.server.ts',
  'app/ai-path/lib/supabase-session-repository.ts',
  'app/ai-path/lib/learning-plan-http.ts',
  'app/ai-path/lib/learning-plan-persistence.server.ts',
  'app/ai-path/lib/learning-plan-runtime-response.ts',
  'app/ai-path/lib/learning-plan-runtime.ts',
  'app/ai-path/lib/learning-plan-service.ts',
  'app/ai-path/lib/learning-plan-supabase.server.ts',
  'app/ai-path/lib/learning-plan-supabase.ts',
  'app/ai-path/lib/analytics-http.ts',
  'app/ai-path/lib/analytics.server.ts',
  'app/ai-path/lib/analytics.ts',
  'app/ai-path/lib/retention-http.ts',
  'app/ai-path/lib/retention-supabase.server.ts',
  'app/ai-path/lib/retention-supabase.ts',
  'app/ai-path/lib/retention.ts',
  'app/ai-path/lib/realtime.server.ts',
  'app/ai-path/lib/realtime-admission.ts',
  'app/ai-path/lib/realtime-admission-policy-contract.ts',
  'app/ai-path/lib/realtime-admission-policy.server.ts',
  'app/ai-path/lib/realtime-admission-supabase.server.ts',
  'app/ai-path/lib/realtime-admission-supabase.ts',
  'app/ai-path/lib/realtime-admission-maintenance-supabase.server.ts',
  'app/ai-path/lib/realtime-admission-maintenance-supabase.ts',
  'app/ai-path/durable-persistence.test.mjs',
  'app/ai-path/goal-type-binding-sql.test.mjs',
  'app/ai-path/learning-plan.test.mjs',
  'app/ai-path/learning-plan-sql.test.mjs',
  'app/ai-path/learning-plan-http.test.mjs',
  'app/ai-path/learning-plan-durable.test.mjs',
  'app/ai-path/realtime-safety.test.mjs',
  'app/ai-path/realtime-admission.test.mjs',
  'app/ai-path/realtime-admission-sql.test.mjs',
  'app/ai-path/realtime-admission-lifecycle-sql.test.mjs',
  'app/ai-path/realtime-admission-policy.test.mjs',
  'app/ai-path/realtime-admission-supabase.test.mjs',
  'app/ai-path/realtime-admission-maintenance-supabase.test.mjs',
  'app/ai-path/retention.test.mjs',
  'app/ai-path/retention-supabase.test.mjs',
  'app/ai-path/retention-bounded-sql.test.mjs',
  'app/ai-path/analytics.test.mjs',
  'app/ai-path/analytics-http.test.mjs',
  'docs/ai-path/CATALOG.md',
  'docs/ai-path/MEASUREMENT.md',
  'docs/ai-path/PLAN_LOOP.md',
  'docs/ai-path/TRUSTED_REPORT_WRITER.md',
  'docs/ai-path/REALTIME_ADMISSION.md',
  'docs/ai-path/REALTIME_ADMISSION_SUPABASE_ADAPTER.md',
  'docs/ai-path/REALTIME_ADMISSION_POLICY.md',
  'docs/ai-path/REALTIME_CONTINUITY_DATABASE_PROOF.md',
  'docs/ai-path/DATABASE_PROOF_RUNBOOK.md',
  'docs/ai-path/RETENTION_OPERATIONS.md',
  'docs/ai-path/RETENTION_SUPABASE_ADAPTER.md',
  'docs/ai-path/OBSERVABILITY.md',
  'scripts/ai-path-db-proof.sh',
  'scripts/ai-path-db-proof/00-local-supabase-compat.sql',
  'scripts/ai-path-db-proof/10-contracts.sql',
  'scripts/ai-path-db-proof/20-concurrency-reserve.sql',
  'scripts/ai-path-db-proof/static.test.mjs',
]

const latchChecks = [
  {
    id: 'durable_sessions',
    label: 'Durable assessment sessions',
    file: 'app/ai-path/lib/supabase-persistence.ts',
    constant: 'AI_PATH_SUPABASE_PRODUCTION_LATCH',
    optional: false,
  },
  {
    id: 'trusted_report_writer',
    label: 'Trusted durable report writer',
    file: 'app/ai-path/lib/supabase-session-repository.server.ts',
    constant: 'AI_PATH_TRUSTED_REPORT_WRITER_LATCH',
    optional: false,
  },
  {
    id: 'durable_plans',
    label: 'Durable learning-plan persistence',
    file: 'app/ai-path/lib/learning-plan-capability.ts',
    constant: 'AI_PATH_DURABLE_LEARNING_PLAN_LATCH',
    optional: true,
  },
  {
    id: 'durable_plan_gateway',
    label: 'Durable learning-plan Supabase gateway',
    file: 'app/ai-path/lib/learning-plan-supabase.server.ts',
    constant: 'AI_PATH_SUPABASE_PLAN_GATEWAY_LATCH',
    optional: true,
  },
  {
    id: 'analytics_sink',
    label: 'Production analytics sink',
    file: 'app/ai-path/lib/analytics.ts',
    constant: 'AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH',
    optional: false,
  },
  {
    id: 'retention_job',
    label: 'Durable retention mutation job',
    file: 'app/api/cron/ai-path-retention/route.ts',
    constant: 'AI_PATH_RETENTION_JOB_READY',
    optional: false,
  },
  {
    id: 'durable_retention_gateway',
    label: 'Durable Supabase retention gateway',
    file: 'app/ai-path/lib/retention-supabase.server.ts',
    constant: 'AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH',
    optional: true,
  },
  {
    id: 'realtime_public_bootstrap',
    label: 'Paid Realtime public bootstrap',
    file: 'app/ai-path/lib/foundation.ts',
    constant: 'AI_PATH_PUBLIC_REALTIME_BOOTSTRAP_READY',
    optional: false,
  },
  {
    id: 'realtime_admission',
    label: 'Realtime production admission store',
    file: 'app/ai-path/lib/realtime-admission.ts',
    constant: 'AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH',
    optional: true,
  },
  {
    id: 'realtime_admission_policy_rollout',
    label: 'Realtime admission policy rollout',
    file: 'app/ai-path/lib/realtime-admission-policy.server.ts',
    constant: 'AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH',
    optional: true,
  },
  {
    id: 'durable_realtime_admission_gateway',
    label: 'Durable Realtime admission Supabase gateway',
    file: 'app/ai-path/lib/realtime-admission-supabase.server.ts',
    constant: 'AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH',
    optional: true,
  },
  {
    id: 'realtime_admission_maintenance_gateway',
    label: 'Realtime admission maintenance gateway',
    file: 'app/ai-path/lib/realtime-admission-maintenance-supabase.server.ts',
    constant: 'AI_PATH_SUPABASE_REALTIME_ADMISSION_MAINTENANCE_GATEWAY_LATCH',
    optional: true,
  },
]

const externalBlockers = [
  {
    id: 'durable_plan_runtime_engineering',
    owner: 'Application and data engineering',
    action: 'Wire the dormant Supabase plan adapter into request selection only after the eight-migration disposable-database suite passes race, rollback, ownership, and export tests.',
  },
  {
    id: 'realtime_route_engineering',
    owner: 'Application and security engineering',
    action: 'Implement the authenticated owner-session bootstrap sequence and require an atomic admission reservation before any paid OpenAI Realtime call.',
  },
  {
    id: 'realtime_admission_proof_and_rollout',
    owner: 'Platform and data engineering',
    action: 'Prove authenticated intent issuance, database-owned continuity, exact policy enforcement, unknown-commit replay, concurrency, timeout, and rollback before opening any admission latch.',
  },
  {
    id: 'retention_adapter_engineering',
    owner: 'Platform engineering',
    action: 'Wire the bounded dormant retention runner only after database proof, then capacity-test concurrent batches and prove idempotent observable deletion before opening either retention latch.',
  },
  {
    id: 'supabase_project_and_auth',
    owner: 'User / platform operator',
    action: 'Provide and configure the production Supabase project, verified auth provider, cookie refresh flow, and secret storage.',
  },
  {
    id: 'database_migrations_and_rls_proof',
    owner: 'Platform engineering',
    action: 'Apply all eight migrations with the fail-closed local harness and pass RLS, RPC permission, continuity, concurrency, cascade, replay, rollback, export, bounded retention, lifecycle archive, and deletion tests.',
  },
  {
    id: 'trusted_server_credentials',
    owner: 'Security / platform operator',
    action: 'Provision server-only service credentials with rotation, audit, redaction, and incident-revocation procedures.',
  },
  {
    id: 'retention_operations',
    owner: 'Platform operations',
    action: 'Configure the authenticated scheduler, behavioral purge verification, alerting, runbooks, and deletion-latency monitoring.',
  },
  {
    id: 'distributed_abuse_and_spend_controls',
    owner: 'Platform / finance owner',
    action: 'Approve and configure distributed rate limiting, per-user concurrency, daily spend ceilings, alerts, and a kill switch.',
  },
  {
    id: 'analytics_governance',
    owner: 'Privacy / product analytics',
    action: 'Approve a privacy-reviewed sink, region, retention, deletion behavior, cohort thresholds, access control, and any vendor spend.',
  },
  {
    id: 'openai_realtime_approval',
    owner: 'User / spend approver',
    action: 'Explicitly approve paid OpenAI Realtime usage and configure production credentials only after authenticated admission tests pass.',
  },
  {
    id: 'deployment_and_launch',
    owner: 'Release owner',
    action: 'Configure the production deployment, domain, security headers, monitoring, backups, rollback, calibration study, accessibility audit, and launch acceptance.',
  },
]

function normalizePath(root, path) {
  return relative(root, join(root, path)).split('\\').join('/')
}

function filePresence(root, paths) {
  return paths.map((path) => ({ path: normalizePath(root, path), present: existsSync(join(root, path)) }))
}

function uncommentedSource(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
}

export function inspectLiteralFalse(source, constant) {
  const sanitized = uncommentedSource(source)
  const escaped = constant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const declaration = new RegExp(`\\bexport\\s+const\\s+${escaped}\\s*=\\s*([^;\\r\\n]+)`, 'g')
  const values = [...sanitized.matchAll(declaration)].map((match) => match[1].trim())
  return {
    declarations: values.length,
    literalFalse: values.length === 1 && values[0] === 'false as const',
  }
}

function inspectLatch(root, check) {
  const absolute = join(root, check.file)
  if (!existsSync(absolute)) {
    return {
      id: check.id,
      label: check.label,
      file: check.file,
      constant: check.constant,
      status: check.optional ? 'not_present' : 'broken',
      detail: check.optional
        ? 'Optional module is not present; no activation surface was found.'
        : 'Required latch source is missing, so fail-closed state cannot be verified.',
    }
  }
  const result = inspectLiteralFalse(readFileSync(absolute, 'utf8'), check.constant)
  return {
    id: check.id,
    label: check.label,
    file: check.file,
    constant: check.constant,
    status: result.literalFalse ? 'locked' : 'broken',
    detail: result.literalFalse
      ? 'Literal false code gate verified.'
      : `Expected one literal false export; found ${result.declarations} matching declaration(s).`,
  }
}

function inspectRealtimeRoute(root) {
  const file = 'app/api/ai-path/realtime/session/route.ts'
  const absolute = join(root, file)
  if (!existsSync(absolute)) {
    return {
      id: 'realtime_route_network_isolation',
      label: 'Realtime public-route network isolation',
      file,
      constant: null,
      status: 'broken',
      detail: 'Realtime public route is missing, so its paid-network isolation cannot be verified.',
    }
  }
  const source = uncommentedSource(readFileSync(absolute, 'utf8'))
  const forbidden = /createLiveRealtimeCall|api\.openai\.com|\bfetch\s*\(/
  return {
    id: 'realtime_route_network_isolation',
    label: 'Realtime public-route network isolation',
    file,
    constant: null,
    status: forbidden.test(source) ? 'broken' : 'locked',
    detail: forbidden.test(source)
      ? 'Public route contains a direct live-network call surface.'
      : 'Public route has no direct OpenAI/fetch/live-call invocation.',
  }
}

export function inspectAiPathReadiness(options = {}) {
  const root = resolve(options.root ?? scriptRoot)
  const privateInventory = filePresence(root, privateAlphaFiles)
  const productionInventory = filePresence(root, productionFoundationFiles)
  const safetyChecks = [
    ...latchChecks.map((check) => inspectLatch(root, check)),
    inspectRealtimeRoute(root),
  ]
  const brokenSafety = safetyChecks.filter((check) => check.status === 'broken')
  const missingPrivateAlpha = privateInventory.filter((item) => !item.present)
  const missingProductionFoundation = productionInventory.filter((item) => !item.present)
  const safePrivateAlpha = brokenSafety.length === 0 && missingPrivateAlpha.length === 0

  // External operational proof is intentionally not inferred from environment
  // variables, credentials, or local files. Those blockers require human attestation.
  const productionReady = safePrivateAlpha
    && missingProductionFoundation.length === 0
    && externalBlockers.length === 0

  return {
    readinessVersion: AI_PATH_READINESS_VERSION,
    safePrivateAlpha,
    productionReady,
    safety: {
      ok: brokenSafety.length === 0,
      locked: safetyChecks.filter((check) => check.status === 'locked').length,
      optionalNotPresent: safetyChecks.filter((check) => check.status === 'not_present').length,
      broken: brokenSafety.length,
      checks: safetyChecks,
    },
    inventory: {
      privateAlpha: {
        complete: missingPrivateAlpha.length === 0,
        present: privateInventory.filter((item) => item.present).length,
        required: privateInventory.length,
        missing: missingPrivateAlpha.map((item) => item.path),
      },
      productionFoundation: {
        complete: missingProductionFoundation.length === 0,
        present: productionInventory.filter((item) => item.present).length,
        required: productionInventory.length,
        missing: missingProductionFoundation.map((item) => item.path),
      },
    },
    externalBlockers,
    policy: {
      readsSecrets: false,
      makesNetworkCalls: false,
      mutatesWorkspace: false,
      defaultExitNonzeroOnlyForBrokenSafety: true,
    },
  }
}

export function formatHumanReadiness(report) {
  const lines = [
    'AI Path readiness',
    `Safe private alpha: ${report.safePrivateAlpha ? 'YES' : 'NO'}`,
    `Production ready: ${report.productionReady ? 'YES' : 'NO'}`,
    `Safety gates: ${report.safety.locked} locked, ${report.safety.optionalNotPresent} optional absent, ${report.safety.broken} broken`,
    `Private-alpha source inventory: ${report.inventory.privateAlpha.present}/${report.inventory.privateAlpha.required}`,
    `Production-foundation inventory: ${report.inventory.productionFoundation.present}/${report.inventory.productionFoundation.required}`,
  ]
  if (report.inventory.privateAlpha.missing.length) {
    lines.push('Missing private-alpha files:')
    report.inventory.privateAlpha.missing.forEach((path) => lines.push(`  - ${path}`))
  }
  if (report.inventory.productionFoundation.missing.length) {
    lines.push('Missing production-foundation files:')
    report.inventory.productionFoundation.missing.forEach((path) => lines.push(`  - ${path}`))
  }
  lines.push('Safety checks:')
  report.safety.checks.forEach((check) => lines.push(`  - [${check.status.toUpperCase()}] ${check.label}: ${check.detail}`))
  lines.push('Actionable external blockers:')
  report.externalBlockers.forEach((blocker) => lines.push(`  - ${blocker.id} (${blocker.owner}): ${blocker.action}`))
  lines.push('No environment files, credentials, or secret values were read or printed.')
  return lines.join('\n')
}

function parseCli(argv) {
  return {
    json: argv.includes('--json'),
    requireProduction: argv.includes('--require-production'),
  }
}

export function readinessExitCode(report, options = {}) {
  if (!report.safety.ok) return 1
  if (options.requireProduction && !report.productionReady) return 2
  return 0
}

function main() {
  const options = parseCli(process.argv.slice(2))
  const report = inspectAiPathReadiness()
  process.stdout.write(options.json
    ? `${JSON.stringify(report, null, 2)}\n`
    : `${formatHumanReadiness(report)}\n`)
  process.exitCode = readinessExitCode(report, options)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
