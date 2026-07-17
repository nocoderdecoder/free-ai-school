#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
  AI_PATH_SEMANTIC_LATCH_FILES,
  inspectAiPathSemanticLatchGate,
} from './ai-path-semantic-latch-gate.mjs'

export const AI_PATH_READINESS_VERSION = '2026-07-17.v1'

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const privateAlphaFiles = [
  'app/ai-path/page.tsx',
  'app/ai-path/AdvisorApp.tsx',
  'app/ai-path/ai-path.css',
  'app/ai-path/lib/adaptive-interview.ts',
  'app/ai-path/lib/foundation.ts',
  'app/ai-path/lib/plan-composer.ts',
  'app/ai-path/lib/plan.ts',
  'app/ai-path/client/analytics.ts',
  'app/api/ai-path/session/route.ts',
  'app/api/ai-path/analysis/route.ts',
  'app/ai-path/foundation.test.mjs',
  'app/ai-path/adaptive-interview.test.mjs',
  'app/ai-path/plan-composer.test.mjs',
  'app/ai-path/route-handlers.test.mjs',
  'app/ai-path/reviewed-assessment.test.mjs',
  'app/ai-path/reviewed-understanding.test.mjs',
  'app/ai-path/lib/reviewed-understanding.ts',
  'app/ai-path/plan.test.mjs',
  'app/ai-path/client/analytics.test.mjs',
  'docs/ai-path/PRODUCT.md',
  'docs/ai-path/ARCHITECTURE.md',
  'docs/ai-path/DELIVERY.md',
  'docs/ai-path/research/README.md',
  'docs/ai-path/research/review-packet.schema.json',
  'scripts/ai-path-research-agreement.mjs',
  'scripts/ai-path-research-agreement.test.mjs',
  'scripts/ai-path-research-readiness.mjs',
  'scripts/ai-path-research-readiness.test.mjs',
  'scripts/ai-path-private-alpha-acceptance.mjs',
  'scripts/ai-path-private-alpha-acceptance.test.mjs',
  'scripts/ai-path-e2e-qa.js',
  'scripts/ai-path-qa.md',
  'docs/ai-path/PRIVATE_ALPHA_ACCEPTANCE.md',
  'docs/ai-path/research/SESSION_READINESS.md',
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
  'supabase/migrations/20260717090000_ai_path_analysis_transition.sql',
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
  'app/ai-path/lib/durable-trusted-analysis-runtime.server.ts',
  'app/ai-path/lib/trusted-analysis.ts',
  'app/ai-path/lib/supabase-auth.server.ts',
  'app/ai-path/lib/supabase-persistence.ts',
  'app/ai-path/lib/supabase-session-repository.server.ts',
  'app/ai-path/lib/supabase-session-repository.ts',
  'app/ai-path/lib/learning-plan-http.ts',
  'app/ai-path/lib/durable-learning-plan-runtime.server.ts',
  'app/ai-path/lib/learning-plan-persistence.server.ts',
  'app/ai-path/lib/learning-plan-runtime-response.ts',
  'app/ai-path/lib/learning-plan-runtime.ts',
  'app/ai-path/lib/learning-plan-service.ts',
  'app/ai-path/lib/learning-plan-supabase.server.ts',
  'app/ai-path/lib/learning-plan-supabase.ts',
  'app/ai-path/lib/analytics-http.ts',
  'app/ai-path/lib/analytics.server.ts',
  'app/ai-path/lib/analytics.ts',
  'app/ai-path/lib/analytics-production.ts',
  'app/ai-path/lib/analytics-production.server.ts',
  'app/ai-path/lib/rate-limit.ts',
  'app/ai-path/lib/rate-limit.server.ts',
  'app/ai-path/lib/retention-http.ts',
  'app/ai-path/lib/retention-supabase.server.ts',
  'app/ai-path/lib/retention-supabase.ts',
  'app/ai-path/lib/retention.ts',
  'app/ai-path/lib/retention-runtime.server.ts',
  'app/ai-path/lib/realtime.server.ts',
  'app/ai-path/lib/realtime-bootstrap.ts',
  'app/ai-path/lib/realtime-bootstrap-runtime.server.ts',
  'app/ai-path/lib/realtime-provider-lifecycle.ts',
  'app/ai-path/lib/realtime-admission.ts',
  'app/ai-path/lib/realtime-admission-policy-contract.ts',
  'app/ai-path/lib/realtime-admission-policy.server.ts',
  'app/ai-path/lib/realtime-admission-supabase.server.ts',
  'app/ai-path/lib/realtime-admission-supabase.ts',
  'app/ai-path/lib/realtime-admission-maintenance-supabase.server.ts',
  'app/ai-path/lib/realtime-admission-maintenance-supabase.ts',
  'app/ai-path/durable-persistence.test.mjs',
  'app/ai-path/durable-text-gate.test.mjs',
  'app/ai-path/goal-type-binding-sql.test.mjs',
  'app/ai-path/learning-plan.test.mjs',
  'app/ai-path/learning-plan-sql.test.mjs',
  'app/ai-path/learning-plan-http.test.mjs',
  'app/ai-path/learning-plan-durable.test.mjs',
  'app/ai-path/realtime-safety.test.mjs',
  'app/ai-path/realtime-bootstrap.test.mjs',
  'app/ai-path/realtime-bootstrap-runtime.test.mjs',
  'app/ai-path/realtime-provider-lifecycle.test.mjs',
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
  'app/ai-path/analytics-production.test.mjs',
  'app/ai-path/rate-limit.test.mjs',
  'docs/ai-path/CATALOG.md',
  'docs/ai-path/MEASUREMENT.md',
  'docs/ai-path/PLAN_LOOP.md',
  'docs/ai-path/TRUSTED_REPORT_WRITER.md',
  'docs/ai-path/REALTIME_ADMISSION.md',
  'docs/ai-path/REALTIME_ADMISSION_SUPABASE_ADAPTER.md',
  'docs/ai-path/REALTIME_ADMISSION_POLICY.md',
  'docs/ai-path/REALTIME_CONTINUITY_DATABASE_PROOF.md',
  'docs/ai-path/DATABASE_PROOF_RUNBOOK.md',
  'docs/ai-path/DURABLE_TEXT_RELEASE_GATE.md',
  'docs/ai-path/REALTIME_PROVIDER_READINESS.md',
  'docs/ai-path/REALTIME_REQUEST_ASSEMBLY.md',
  'docs/ai-path/RETENTION_OPERATIONS.md',
  'docs/ai-path/RETENTION_SUPABASE_ADAPTER.md',
  'docs/ai-path/OBSERVABILITY.md',
  'docs/ai-path/LAUNCH_DECISION.md',
  'docs/ai-path/RATE_LIMITING.md',
  'docs/ai-path/SEMANTIC_LATCH_GATE.md',
  'scripts/ai-path-db-proof.sh',
  '.github/workflows/ai-path-db-proof.yml',
  'scripts/ai-path-db-proof-preflight.mjs',
  'scripts/ai-path-db-proof/00-local-supabase-compat.sql',
  'scripts/ai-path-db-proof/10-contracts.sql',
  'scripts/ai-path-db-proof/20-concurrency-reserve.sql',
  'scripts/ai-path-db-proof/ci-bootstrap.sql',
  'scripts/ai-path-db-proof/static.test.mjs',
  'scripts/ai-path-durable-text-gate.mjs',
  'scripts/ai-path-staging-evidence.mjs',
  'scripts/ai-path-staging-evidence.test.mjs',
  'scripts/ai-path-launch-decision.mjs',
  'scripts/ai-path-launch-decision.test.mjs',
  'scripts/ai-path-semantic-latch-gate.mjs',
  'scripts/ai-path-semantic-latch-gate.test.mjs',
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
    id: 'trusted_analysis_transition',
    label: 'Trusted durable analysis transition',
    file: 'app/ai-path/lib/supabase-session-repository.server.ts',
    constant: 'AI_PATH_TRUSTED_ANALYSIS_TRANSITION_LATCH',
    optional: true,
  },
  {
    id: 'durable_trusted_analysis_runtime',
    label: 'Durable trusted-analysis request runtime',
    file: 'app/ai-path/lib/durable-trusted-analysis-runtime.server.ts',
    constant: 'AI_PATH_DURABLE_TRUSTED_ANALYSIS_RUNTIME_LATCH',
    optional: true,
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
    id: 'distributed_rate_limit',
    label: 'Distributed production rate limiting',
    file: 'app/ai-path/lib/rate-limit.ts',
    constant: 'AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH',
    optional: true,
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
    id: 'realtime_authenticated_bootstrap',
    label: 'Authenticated Realtime owner-to-reservation bootstrap',
    file: 'app/ai-path/lib/realtime-bootstrap.ts',
    constant: 'AI_PATH_REALTIME_AUTHENTICATED_BOOTSTRAP_LATCH',
    optional: false,
  },
  {
    id: 'realtime_request_assembly',
    label: 'Request-scoped split-credential Realtime assembly',
    file: 'app/ai-path/lib/realtime-bootstrap-runtime.server.ts',
    constant: 'AI_PATH_REALTIME_REQUEST_ASSEMBLY_LATCH',
    optional: true,
  },
  {
    id: 'realtime_provider_lifecycle',
    label: 'Realtime provider lifecycle reconciliation',
    file: 'app/ai-path/lib/realtime-provider-lifecycle.ts',
    constant: 'AI_PATH_REALTIME_PROVIDER_LIFECYCLE_LATCH',
    optional: true,
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
    action: 'Dormant request-runtime wiring and the nine-migration disposable-database suite are complete. Keep every latch closed while platform engineering deploys the exact commit to isolated authenticated staging and collects ownership, rollback, export, deletion, and retention evidence for review.',
  },
  {
    id: 'realtime_route_engineering',
    owner: 'Application and security engineering',
    action: 'The provider-free authenticated sequence, dormant request-scoped split-credential runtime, and mock unknown-commit reconciliation contract are implemented and adversarially tested. Prove the assembled path and guaranteed zero-provider-call denials in isolated hosted staging, then review the still-closed route, assembly, lifecycle, and provider latches.',
  },
  {
    id: 'realtime_admission_proof_and_rollout',
    owner: 'Platform and data engineering',
    action: 'Database-owned intent, continuity, policy, concurrency, lifecycle, and rollback contracts pass in disposable PostgreSQL, and mock reconciliation is source-complete. Prove request-level timeouts, unknown-commit replay, lifecycle outcomes, and zero-provider-call denials with split credentials in isolated staging before opening any admission latch.',
  },
  {
    id: 'retention_adapter_engineering',
    owner: 'Platform engineering',
    action: 'The bounded gateway, database purge contracts, and fixed per-target deadline are complete. Assemble the dormant runner only in isolated staging, then capacity-test concurrent batches and prove idempotent observable deletion before opening either retention latch.',
  },
  {
    id: 'supabase_project_and_auth',
    owner: 'User / platform operator',
    action: 'Provide an isolated non-production Supabase-compatible project, verified auth provider, cookie refresh flow, and server-only secret storage for staging evidence; production provisioning follows reviewed activation readiness.',
  },
  {
    id: 'database_migrations_and_rls_proof',
    owner: 'Platform engineering',
    action: 'The disposable PostgreSQL 16 behavioral suite passes on the pull request. Re-run it for the exact release commit using an accepted push or workflow-dispatch event and bind the successful run metadata plus artifact hashes into the reviewed release evidence packet.',
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

function inspectRealtimeBootstrapIsolation(root) {
  const file = 'app/ai-path/lib/realtime-bootstrap.ts'
  const absolute = join(root, file)
  if (!existsSync(absolute)) {
    return {
      id: 'realtime_bootstrap_provider_isolation',
      label: 'Authenticated Realtime bootstrap provider isolation',
      file,
      constant: null,
      status: 'broken',
      detail: 'Authenticated bootstrap source is missing, so provider isolation cannot be verified.',
    }
  }
  const source = uncommentedSource(readFileSync(absolute, 'utf8'))
  const forbidden = /\bcreateLiveRealtimeCall\b|api\.openai\.com|\bOPENAI_[A-Z0-9_]*KEY\b|\bfetch\s*\(|from\s+['"]openai['"]|import\s*\(\s*['"]openai['"]\s*\)/i
  return {
    id: 'realtime_bootstrap_provider_isolation',
    label: 'Authenticated Realtime bootstrap provider isolation',
    file,
    constant: null,
    status: forbidden.test(source) ? 'broken' : 'locked',
    detail: forbidden.test(source)
      ? 'Authenticated bootstrap contains a provider credential or live-network call surface.'
      : 'Authenticated bootstrap stops at atomic reservation with no provider credential or call surface.',
  }
}

function inspectOptionalProviderFreeSource(root, check) {
  const absolute = join(root, check.file)
  if (!existsSync(absolute)) {
    return {
      id: check.id,
      label: check.label,
      file: check.file,
      constant: null,
      status: 'not_present',
      detail: 'Optional provider-free module is not present; no activation surface was found.',
    }
  }
  const source = uncommentedSource(readFileSync(absolute, 'utf8'))
  const forbidden = /\bcreateLiveRealtimeCall\b|api\.openai\.com|\bOPENAI_[A-Z0-9_]*KEY\b|\bfetch\s*\(|from\s+['"]openai['"]|import\s*\(\s*['"]openai['"]\s*\)|OpenAI-Safety-Identifier|https?:\/\//i
  return {
    id: check.id,
    label: check.label,
    file: check.file,
    constant: null,
    status: forbidden.test(source) ? 'broken' : 'locked',
    detail: forbidden.test(source)
      ? 'Provider-free module contains a provider credential, URL, SDK, or network-call surface.'
      : 'Provider-free module has no provider credential, URL, SDK, or network-call surface.',
  }
}

function inspectSemanticLatchSideEffects(root) {
  if (AI_PATH_SEMANTIC_LATCH_FILES.some(file => !existsSync(join(root, file)))) {
    return {
      id: 'semantic_latch_side_effects',
      label: 'Semantic latch side-effect dominance',
      file: 'scripts/ai-path-semantic-latch-gate.mjs',
      constant: null,
      status: 'not_present',
      detail: 'Optional semantic source set is incomplete; no readiness claim is made.',
    }
  }
  try {
    const report = inspectAiPathSemanticLatchGate({ root })
    return {
      id: 'semantic_latch_side_effects',
      label: 'Semantic latch side-effect dominance',
      file: 'scripts/ai-path-semantic-latch-gate.mjs',
      constant: null,
      status: report.ok ? 'locked' : 'broken',
      detail: report.ok
        ? `${report.verified}/${report.required} sensitive effects are dominated by closed latches.`
        : `${report.checks.filter(check => check.status === 'broken').length} semantic latch contract(s) are broken.`,
    }
  } catch {
    return {
      id: 'semantic_latch_side_effects',
      label: 'Semantic latch side-effect dominance',
      file: 'scripts/ai-path-semantic-latch-gate.mjs',
      constant: null,
      status: 'broken',
      detail: 'Semantic latch inspection failed closed.',
    }
  }
}

export function inspectAiPathReadiness(options = {}) {
  const root = resolve(options.root ?? scriptRoot)
  const privateInventory = filePresence(root, privateAlphaFiles)
  const productionInventory = filePresence(root, productionFoundationFiles)
  const safetyChecks = [
    ...latchChecks.map((check) => inspectLatch(root, check)),
    inspectRealtimeRoute(root),
    inspectRealtimeBootstrapIsolation(root),
    inspectOptionalProviderFreeSource(root, {
      id: 'realtime_request_assembly_provider_isolation',
      label: 'Realtime request-assembly provider isolation',
      file: 'app/ai-path/lib/realtime-bootstrap-runtime.server.ts',
    }),
    inspectOptionalProviderFreeSource(root, {
      id: 'realtime_provider_lifecycle_network_isolation',
      label: 'Realtime lifecycle reconciliation network isolation',
      file: 'app/ai-path/lib/realtime-provider-lifecycle.ts',
    }),
    inspectSemanticLatchSideEffects(root),
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
