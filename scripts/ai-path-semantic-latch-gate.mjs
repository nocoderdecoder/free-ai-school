#!/usr/bin/env node

import { existsSync, lstatSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import ts from 'typescript'

export const AI_PATH_SEMANTIC_LATCH_GATE_VERSION = '2026-07-17.v1'

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const maximumSourceBytes = 1024 * 1024

const guardContracts = [
  {
    id: 'durable_session_activation',
    file: 'app/ai-path/lib/supabase-persistence.ts',
    functionName: 'resolveSupabasePersistenceCapability',
    latches: [['app/ai-path/lib/supabase-persistence.ts', 'AI_PATH_SUPABASE_PRODUCTION_LATCH']],
    guardTerms: ['!AI_PATH_SUPABASE_PRODUCTION_LATCH'],
    effects: ["mode: 'supabase'", 'productionReady: true'],
  },
  {
    id: 'trusted_analysis_transition',
    file: 'app/ai-path/lib/supabase-session-repository.server.ts',
    functionName: 'createSupabaseTrustedAnalysisTransition',
    latches: [['app/ai-path/lib/supabase-session-repository.server.ts', 'AI_PATH_TRUSTED_ANALYSIS_TRANSITION_LATCH']],
    guardTerms: ['!AI_PATH_TRUSTED_ANALYSIS_TRANSITION_LATCH'],
    effects: ['new SupabaseTrustedAnalysisTransition'],
  },
  {
    id: 'trusted_report_writer',
    file: 'app/ai-path/lib/supabase-session-repository.server.ts',
    functionName: 'createSupabaseTrustedReportWriter',
    latches: [['app/ai-path/lib/supabase-session-repository.server.ts', 'AI_PATH_TRUSTED_REPORT_WRITER_LATCH']],
    guardTerms: ['!AI_PATH_TRUSTED_REPORT_WRITER_LATCH'],
    effects: ['new SupabaseTrustedReportWriter'],
  },
  {
    id: 'durable_trusted_analysis_runtime_credentials',
    file: 'app/ai-path/lib/durable-trusted-analysis-runtime.server.ts',
    functionName: 'createDurableTrustedAnalysisRuntime',
    latches: [
      ['app/ai-path/lib/durable-trusted-analysis-runtime.server.ts', 'AI_PATH_DURABLE_TRUSTED_ANALYSIS_RUNTIME_LATCH'],
      ['app/ai-path/lib/supabase-session-repository.server.ts', 'AI_PATH_TRUSTED_ANALYSIS_TRANSITION_LATCH'],
      ['app/ai-path/lib/supabase-session-repository.server.ts', 'AI_PATH_TRUSTED_REPORT_WRITER_LATCH'],
    ],
    guardTerms: [
      '!AI_PATH_DURABLE_TRUSTED_ANALYSIS_RUNTIME_LATCH',
      '!AI_PATH_TRUSTED_ANALYSIS_TRANSITION_LATCH',
      '!AI_PATH_TRUSTED_REPORT_WRITER_LATCH',
    ],
    effects: [
      'createVerifiedSupabaseContext(request)',
      'process.env.SUPABASE_SERVICE_ROLE_KEY',
      'createClient<Database>',
    ],
  },
  {
    id: 'durable_plan_gateway',
    file: 'app/ai-path/lib/learning-plan-supabase.server.ts',
    functionName: 'resolveSupabaseLearningPlanGatewayCapability',
    latches: [['app/ai-path/lib/learning-plan-supabase.server.ts', 'AI_PATH_SUPABASE_PLAN_GATEWAY_LATCH']],
    guardTerms: ['!AI_PATH_SUPABASE_PLAN_GATEWAY_LATCH'],
    effects: ['available: true'],
  },
  {
    id: 'production_analytics_capability',
    file: 'app/ai-path/lib/analytics-production.ts',
    functionName: 'resolveProductionAnalyticsCapability',
    latches: [['app/ai-path/lib/analytics.ts', 'AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH']],
    guardTerms: ['!AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH'],
    effects: ['available: true', 'productionReady: true'],
  },
  {
    id: 'production_analytics_factory_chain',
    file: 'app/ai-path/lib/analytics-production.server.ts',
    functionName: 'createProductionAnalyticsService',
    latches: [['app/ai-path/lib/analytics.ts', 'AI_PATH_ANALYTICS_PRODUCTION_SINK_LATCH']],
    guardTerms: ['!capability.available'],
    prerequisiteCalls: ['resolveProductionAnalyticsCapability(activation)'],
    effects: ['new PrivacySafeAnalyticsService'],
  },
  {
    id: 'distributed_rate_limit_activation',
    file: 'app/ai-path/lib/rate-limit.ts',
    functionName: 'resolveDistributedRateLimitCapability',
    latches: [['app/ai-path/lib/rate-limit.ts', 'AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH']],
    guardTerms: ['!AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH'],
    effects: ['available: true', 'productionReady: true'],
  },
  {
    id: 'distributed_rate_limit_factory_chain',
    file: 'app/ai-path/lib/rate-limit.server.ts',
    functionName: 'createDistributedRateLimitChecker',
    latches: [['app/ai-path/lib/rate-limit.ts', 'AI_PATH_DISTRIBUTED_RATE_LIMIT_LATCH']],
    guardTerms: ['!capability.available'],
    prerequisiteCalls: ['resolveDistributedRateLimitCapability(activation)'],
    effects: ['distributedStore.consume('],
  },
  {
    id: 'durable_retention_gateway',
    file: 'app/ai-path/lib/retention-supabase.server.ts',
    functionName: 'createSupabaseRetentionRunner',
    latches: [['app/ai-path/lib/retention-supabase.server.ts', 'AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH']],
    guardTerms: ['!AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH'],
    effects: ['runSupabaseRetentionCycle(client, options)'],
  },
  {
    id: 'durable_retention_runtime_credentials',
    file: 'app/ai-path/lib/retention-runtime.server.ts',
    functionName: 'getAiPathRetentionHttpRuntime',
    latches: [['app/ai-path/lib/retention-supabase.server.ts', 'AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH']],
    guardTerms: ['!routeReady', '!AI_PATH_SUPABASE_RETENTION_GATEWAY_LATCH'],
    effects: ['process.env.SUPABASE_SERVICE_ROLE_KEY', 'createClient<Database>'],
  },
  {
    id: 'public_realtime_provider_call',
    file: 'app/ai-path/lib/realtime.server.ts',
    functionName: 'createRealtimeClientSecret',
    latches: [],
    guardTerms: ['!capability.liveEnabled'],
    prerequisiteCalls: ['getRealtimeCapability()'],
    effects: [
      'process.env.OPENAI_API_KEY',
      'safetyIdentifier(input.verifiedUserId)',
      'fetch(OPENAI_REALTIME_CLIENT_SECRETS_URL',
    ],
  },
  {
    id: 'realtime_admission_activation',
    file: 'app/ai-path/lib/realtime-admission.ts',
    functionName: 'resolveRealtimeAdmissionCapability',
    latches: [['app/ai-path/lib/realtime-admission.ts', 'AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH']],
    guardTerms: ['!AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH'],
    effects: ["mode: 'production'", 'productionReady: true'],
  },
  {
    id: 'realtime_request_assembly_credentials',
    file: 'app/ai-path/lib/realtime-bootstrap-runtime.server.ts',
    functionName: 'createRealtimeBootstrapRequestRuntime',
    latches: [
      ['app/ai-path/lib/realtime-bootstrap-runtime.server.ts', 'AI_PATH_REALTIME_REQUEST_ASSEMBLY_LATCH'],
      ['app/ai-path/lib/realtime-bootstrap.ts', 'AI_PATH_REALTIME_AUTHENTICATED_BOOTSTRAP_LATCH'],
      ['app/ai-path/lib/realtime-admission.ts', 'AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH'],
      ['app/ai-path/lib/realtime-admission-policy.server.ts', 'AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH'],
      ['app/ai-path/lib/realtime-admission-supabase.server.ts', 'AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH'],
    ],
    guardTerms: [
      '!AI_PATH_REALTIME_REQUEST_ASSEMBLY_LATCH',
      '!AI_PATH_REALTIME_AUTHENTICATED_BOOTSTRAP_LATCH',
      '!AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH',
      '!AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH',
      '!AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH',
    ],
    effects: [
      'createVerifiedSupabaseContext(request)',
      'process.env.SUPABASE_SERVICE_ROLE_KEY',
      'createClient<Database>',
    ],
  },
  {
    id: 'realtime_provider_lifecycle_mutation',
    file: 'app/ai-path/lib/realtime-provider-lifecycle.ts',
    functionName: 'reconcileMockRealtimeProviderLifecycle',
    latches: [['app/ai-path/lib/realtime-provider-lifecycle.ts', 'AI_PATH_REALTIME_PROVIDER_LIFECYCLE_LATCH']],
    guardTerms: ['!AI_PATH_REALTIME_PROVIDER_LIFECYCLE_LATCH'],
    effects: ['admission.cancel(', 'admission.finalize('],
  },
  {
    id: 'realtime_admission_gateway',
    file: 'app/ai-path/lib/realtime-admission-supabase.server.ts',
    functionName: 'createSupabaseRealtimeAdmissionService',
    latches: [
      ['app/ai-path/lib/realtime-admission-supabase.server.ts', 'AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH'],
      ['app/ai-path/lib/realtime-admission-policy.server.ts', 'AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH'],
    ],
    guardTerms: [
      '!AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH',
      '!AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH',
    ],
    effects: ['new SupabaseRealtimeAdmissionRepository', 'new RealtimeAdmissionService'],
  },
  {
    id: 'realtime_admission_maintenance_gateway',
    file: 'app/ai-path/lib/realtime-admission-maintenance-supabase.server.ts',
    functionName: 'createSupabaseRealtimeAdmissionMaintenanceRunner',
    latches: [['app/ai-path/lib/realtime-admission-maintenance-supabase.server.ts', 'AI_PATH_SUPABASE_REALTIME_ADMISSION_MAINTENANCE_GATEWAY_LATCH']],
    guardTerms: ['!AI_PATH_SUPABASE_REALTIME_ADMISSION_MAINTENANCE_GATEWAY_LATCH'],
    effects: ['serviceRoleClient.rpc(', 'maintainSupabaseRealtimeAdmission('],
  },
]

const positiveBranchContracts = [
  {
    id: 'durable_plan_activation',
    file: 'app/ai-path/lib/learning-plan-capability.ts',
    functionName: 'resolveLearningPlanPersistenceCapability',
    latches: [['app/ai-path/lib/learning-plan-capability.ts', 'AI_PATH_DURABLE_LEARNING_PLAN_LATCH']],
    positiveTerm: 'AI_PATH_DURABLE_LEARNING_PLAN_LATCH',
    effects: ["mode: 'supabase'", 'productionReady: true'],
  },
]

const bindingContracts = [
  {
    id: 'retention_route_to_runtime_binding',
    file: 'app/api/cron/ai-path-retention/route.ts',
    functionName: 'POST',
    latches: [['app/api/cron/ai-path-retention/route.ts', 'AI_PATH_RETENTION_JOB_READY']],
    callName: 'getAiPathRetentionHttpRuntime',
    argument: 'AI_PATH_RETENTION_JOB_READY',
  },
]

export const AI_PATH_SEMANTIC_LATCH_FILES = Object.freeze([...new Set([
  ...guardContracts.flatMap(contract => [contract.file, ...contract.latches.map(([file]) => file)]),
  ...positiveBranchContracts.flatMap(contract => [contract.file, ...contract.latches.map(([file]) => file)]),
  ...bindingContracts.flatMap(contract => [contract.file, ...contract.latches.map(([file]) => file)]),
])].sort())

function normalized(value) {
  return value.replace(/\s+/g, '')
}

function readSource(root, file) {
  const absoluteRoot = resolve(root)
  const absolute = resolve(absoluteRoot, file)
  const inside = relative(absoluteRoot, absolute)
  if (inside.startsWith('..') || inside === '' || !existsSync(absolute)) {
    throw new Error(`required source is missing or outside the repository: ${file}`)
  }
  const stat = lstatSync(absolute)
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size > maximumSourceBytes) {
    throw new Error(`required source must be a bounded regular non-symlink file: ${file}`)
  }
  const text = readFileSync(absolute, 'utf8')
  return {
    file,
    text,
    sourceFile: ts.createSourceFile(
      file,
      text,
      ts.ScriptTarget.Latest,
      true,
      file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  }
}

function findFunction(source, name) {
  let found = null
  function visit(node) {
    if (found) return
    if (ts.isFunctionDeclaration(node) && node.name?.text === name && node.body) {
      found = node
      return
    }
    if (ts.isVariableDeclaration(node)
        && ts.isIdentifier(node.name)
        && node.name.text === name
        && node.initializer
        && (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
        && ts.isBlock(node.initializer.body)) {
      found = node.initializer
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(source.sourceFile)
  return found
}

function statementTerminates(statement) {
  if (ts.isReturnStatement(statement) || ts.isThrowStatement(statement)) return true
  if (ts.isBlock(statement)) {
    const last = statement.statements.at(-1)
    return Boolean(last && statementTerminates(last))
  }
  if (ts.isIfStatement(statement)) {
    return Boolean(statement.elseStatement
      && statementTerminates(statement.thenStatement)
      && statementTerminates(statement.elseStatement))
  }
  return false
}

function checkLiteralFalse(source, constant) {
  const matches = []
  function visit(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.name.text === constant) {
      matches.push(node.initializer?.getText(source.sourceFile) ?? '')
    }
    ts.forEachChild(node, visit)
  }
  visit(source.sourceFile)
  return matches.length === 1 && normalized(matches[0]) === 'falseasconst'
}

function latchFailures(root, latches, cache) {
  const failures = []
  for (const [file, constant] of latches) {
    let source
    try {
      source = cache.get(file) ?? readSource(root, file)
      cache.set(file, source)
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `cannot read ${file}`)
      continue
    }
    if (!checkLiteralFalse(source, constant)) {
      failures.push(`${constant} is not exactly one literal false-as-const declaration in ${file}`)
    }
  }
  return failures
}

function effectOffsets(source, fn, effects) {
  const text = source.text.slice(fn.getStart(source.sourceFile), fn.end)
  const base = fn.getStart(source.sourceFile)
  return effects.map(effect => {
    const offsets = []
    let cursor = 0
    while (cursor <= text.length) {
      const found = text.indexOf(effect, cursor)
      if (found < 0) break
      offsets.push(base + found)
      cursor = found + effect.length
    }
    return { effect, offsets }
  })
}

function inspectGuardContract(root, contract, cache) {
  const failures = latchFailures(root, contract.latches, cache)
  let source
  try {
    source = cache.get(contract.file) ?? readSource(root, contract.file)
    cache.set(contract.file, source)
  } catch (error) {
    failures.push(error instanceof Error ? error.message : `cannot read ${contract.file}`)
    return { id: contract.id, status: 'broken', failures }
  }
  const fn = findFunction(source, contract.functionName)
  if (!fn || !fn.body || !ts.isBlock(fn.body)) {
    failures.push(`guarded function ${contract.functionName} is missing`)
    return { id: contract.id, status: 'broken', failures }
  }

  const required = contract.guardTerms.map(normalized)
  const guard = fn.body.statements.find(statement => {
    if (!ts.isIfStatement(statement)) return false
    const condition = normalized(statement.expression.getText(source.sourceFile))
    return required.every(term => condition.includes(term)) && statementTerminates(statement.thenStatement)
  })
  if (!guard) failures.push(`no terminating guard contains every required term: ${contract.guardTerms.join(', ')}`)

  const effectResults = effectOffsets(source, fn, contract.effects)
  for (const result of effectResults) {
    if (result.offsets.length === 0) failures.push(`sensitive effect is missing from the guarded function: ${result.effect}`)
    if (guard && result.offsets.some(offset => offset < guard.end)) {
      failures.push(`sensitive effect precedes the terminating guard: ${result.effect}`)
    }
  }
  for (const prerequisite of contract.prerequisiteCalls ?? []) {
    const offsets = effectOffsets(source, fn, [prerequisite])[0].offsets
    if (offsets.length !== 1) failures.push(`expected one prerequisite capability call: ${prerequisite}`)
    if (guard && offsets.some(offset => offset > guard.getStart(source.sourceFile))) {
      failures.push(`prerequisite capability call must occur before its terminating availability guard: ${prerequisite}`)
    }
  }
  return {
    id: contract.id,
    status: failures.length === 0 ? 'verified' : 'broken',
    failures,
  }
}

function collectIfStatements(node, output = []) {
  if (ts.isIfStatement(node)) output.push(node)
  ts.forEachChild(node, child => {
    collectIfStatements(child, output)
  })
  return output
}

function inspectPositiveBranchContract(root, contract, cache) {
  const failures = latchFailures(root, contract.latches, cache)
  let source
  try {
    source = cache.get(contract.file) ?? readSource(root, contract.file)
    cache.set(contract.file, source)
  } catch (error) {
    failures.push(error instanceof Error ? error.message : `cannot read ${contract.file}`)
    return { id: contract.id, status: 'broken', failures }
  }
  const fn = findFunction(source, contract.functionName)
  if (!fn || !fn.body) {
    failures.push(`guarded function ${contract.functionName} is missing`)
    return { id: contract.id, status: 'broken', failures }
  }
  const branches = collectIfStatements(fn.body).filter(statement => {
    const condition = normalized(statement.expression.getText(source.sourceFile))
    return condition.includes(normalized(contract.positiveTerm))
      && !condition.includes(normalized(`!${contract.positiveTerm}`))
  })
  const effects = effectOffsets(source, fn, contract.effects)
  for (const result of effects) {
    if (result.offsets.length === 0) failures.push(`sensitive activation effect is missing: ${result.effect}`)
    for (const offset of result.offsets) {
      const protectedByBranch = branches.some(statement => (
        offset >= statement.thenStatement.getStart(source.sourceFile)
        && offset < statement.thenStatement.end
      ))
      if (!protectedByBranch) failures.push(`activation effect is not inside the positive latch branch: ${result.effect}`)
    }
  }
  if (branches.length !== 1) failures.push(`expected one positive branch controlled by ${contract.positiveTerm}`)
  return {
    id: contract.id,
    status: failures.length === 0 ? 'verified' : 'broken',
    failures,
  }
}

function inspectBindingContract(root, contract, cache) {
  const failures = latchFailures(root, contract.latches, cache)
  let source
  try {
    source = cache.get(contract.file) ?? readSource(root, contract.file)
    cache.set(contract.file, source)
  } catch (error) {
    failures.push(error instanceof Error ? error.message : `cannot read ${contract.file}`)
    return { id: contract.id, status: 'broken', failures }
  }
  const fn = findFunction(source, contract.functionName)
  if (!fn) {
    failures.push(`binding function ${contract.functionName} is missing`)
    return { id: contract.id, status: 'broken', failures }
  }
  const calls = []
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source.sourceFile) === contract.callName) calls.push(node)
    ts.forEachChild(node, visit)
  }
  visit(fn)
  if (calls.length !== 1) failures.push(`expected exactly one ${contract.callName} call`)
  if (calls.some(call => normalized(call.arguments[0]?.getText(source.sourceFile) ?? '') !== normalized(contract.argument))) {
    failures.push(`${contract.callName} is not bound to ${contract.argument}`)
  }
  return {
    id: contract.id,
    status: failures.length === 0 ? 'verified' : 'broken',
    failures,
  }
}

export function inspectAiPathSemanticLatchGate(options = {}) {
  const root = resolve(options.root ?? scriptRoot)
  const cache = new Map()
  const checks = [
    ...guardContracts.map(contract => inspectGuardContract(root, contract, cache)),
    ...positiveBranchContracts.map(contract => inspectPositiveBranchContract(root, contract, cache)),
    ...bindingContracts.map(contract => inspectBindingContract(root, contract, cache)),
  ]
  const broken = checks.filter(check => check.status === 'broken')
  return Object.freeze({
    gateVersion: AI_PATH_SEMANTIC_LATCH_GATE_VERSION,
    state: broken.length === 0 ? 'LOCKED_SIDE_EFFECTS_VERIFIED' : 'BROKEN_SEMANTIC_LATCH_INVARIANT',
    ok: broken.length === 0,
    verified: checks.length - broken.length,
    required: checks.length,
    checks: Object.freeze(checks.map(check => Object.freeze({
      ...check,
      failures: Object.freeze([...check.failures]),
    }))),
    policy: Object.freeze({
      readsEnvironment: false,
      readsCredentials: false,
      makesNetworkCalls: false,
      launchesSubprocesses: false,
      mutatesWorkspace: false,
      opensLatches: false,
    }),
  })
}

export function semanticLatchGateExitCode(report) {
  return report.ok ? 0 : 1
}

export function formatAiPathSemanticLatchGate(report) {
  const lines = [
    'AI Path semantic latch and side-effect gate',
    `State: ${report.state}`,
    `Verified contracts: ${report.verified}/${report.required}`,
  ]
  for (const check of report.checks) {
    lines.push(`  - [${check.status.toUpperCase()}] ${check.id}`)
    for (const failure of check.failures) lines.push(`    ${failure}`)
  }
  lines.push('This gate reads source only; it reads no environment or credential, calls no network, runs no subprocess, mutates nothing, and opens no latch.')
  return lines.join('\n')
}

function parseCli(argv) {
  const options = { json: false }
  for (const arg of argv) {
    if (arg === '--json') options.json = true
    else throw new Error(`unknown argument: ${arg}`)
  }
  return options
}

function main() {
  try {
    const options = parseCli(process.argv.slice(2))
    const report = inspectAiPathSemanticLatchGate()
    process.stdout.write(options.json
      ? `${JSON.stringify(report, null, 2)}\n`
      : `${formatAiPathSemanticLatchGate(report)}\n`)
    process.exitCode = semanticLatchGateExitCode(report)
  } catch (error) {
    process.stderr.write(`AI Path semantic latch gate: ${error instanceof Error ? error.message : 'invalid invocation'}\n`)
    process.exitCode = 64
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) main()
