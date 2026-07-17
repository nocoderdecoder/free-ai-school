import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_LEARNING_PLAN_MIGRATION_VERSION,
  resolveLearningPlanPersistenceCapability,
} from './lib/learning-plan-capability.ts'
import {
  parseSupabaseLearningPlanExport,
  SupabaseLearningPlanError,
  SupabaseLearningPlanService,
} from './lib/learning-plan-supabase.ts'
import { getPlanBlueprint } from './lib/plan.ts'

const serverSource = await readFile(new URL('./lib/learning-plan-supabase.server.ts', import.meta.url), 'utf8')
const ownerId = '018f47a2-4e8d-7a32-9d10-f4b68a4ee6de'
const sessionId = '018f47a2-4e8d-7a32-9d10-f4b68a4ee6df'
const planId = '018f47a2-4e8d-7a32-9d10-f4b68a4ee6e0'

function tasks() {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `018f47a2-4e8d-7a32-9d10-${String(index + 1).padStart(12, '0')}`,
    ordinal: index + 1,
    week: Math.floor(index / 3) + 1,
    position: (index % 3) + 1,
    title: `Task ${index + 1}`,
    outcome: `Outcome ${index + 1}`,
  }))
}

function domainPlan(overrides = {}) {
  const blueprint = getPlanBlueprint('workflows')
  return {
    id: planId,
    ownerId,
    sourceAssessmentSessionId: sessionId,
    planVersion: '2026-07-17.v1',
    status: 'active',
    revision: 1,
    currentSnapshotVersion: 1,
    weeklyMinutes: 180,
    snapshots: [{
      version: 1,
      reason: 'initial',
      sourceAssessmentSessionId: sessionId,
      title: blueprint.title,
      proof: blueprint.proof,
      focusNow: blueprint.focusNow,
      notYet: blueprint.notYet,
      tasks: tasks(),
      createdAt: '2026-07-17T03:00:00.000Z',
    }],
    taskProgress: tasks().map(task => ({
      taskId: task.id,
      snapshotVersion: 1,
      status: 'pending',
      updatedAt: '2026-07-17T03:00:00.000Z',
      completedAt: null,
    })),
    checkIns: [],
    adaptations: [],
    timeBudgetHistory: [],
    createdAt: '2026-07-17T03:00:00.000Z',
    updatedAt: '2026-07-17T03:00:00.000Z',
    retentionExpiresAt: '2026-10-15T03:00:00.000Z',
    ...overrides,
  }
}

function gateway(overrides = {}) {
  return {
    async create() { return { data: domainPlan(), error: null } },
    async findOwnedBySourceAssessment() { return { data: null, error: null } },
    async findOwned() { return { data: domainPlan(), error: null } },
    async transitionTask() { return { data: domainPlan({ revision: 2 }), error: null } },
    async adjustTimeBudget() { return { data: domainPlan({ revision: 2, weeklyMinutes: 240 }), error: null } },
    async submitCheckIn() { return { data: domainPlan({ revision: 2 }), error: null } },
    async decideAdaptation() { return { data: domainPlan({ revision: 2 }), error: null } },
    async exportOwned() { return { data: domainPlan(), error: null } },
    async deleteOwned() { return { data: true, error: null } },
    ...overrides,
  }
}

test('memory mode requires an exact development or test environment plus every explicit gate', () => {
  const gates = {
    store: 'memory',
    sessionStore: 'memory',
    enableTestAuth: 'true',
  }
  assert.equal(resolveLearningPlanPersistenceCapability({ ...gates }).available, false)
  assert.equal(resolveLearningPlanPersistenceCapability({ ...gates, nodeEnv: 'preview' }).available, false)
  assert.equal(resolveLearningPlanPersistenceCapability({ ...gates, nodeEnv: 'production' }).available, false)
  assert.equal(resolveLearningPlanPersistenceCapability({ ...gates, nodeEnv: 'test' }).mode, 'memory-test')
  assert.equal(resolveLearningPlanPersistenceCapability({ ...gates, nodeEnv: 'development' }).mode, 'memory-test')
})

test('production durable capability stays closed even when every deployment flag is present', () => {
  const capability = resolveLearningPlanPersistenceCapability({
    nodeEnv: 'production',
    enableDurable: 'true',
    schemaVersion: AI_PATH_LEARNING_PLAN_MIGRATION_VERSION,
  })
  assert.equal(capability.available, false)
  assert.equal(capability.productionReady, false)
  assert.match(capability.reason, /code-level production latch/)
  assert.match(serverSource, /AI_PATH_SUPABASE_PLAN_GATEWAY_LATCH = false as const/)
  assert.match(serverSource, /!AI_PATH_SUPABASE_PLAN_GATEWAY_LATCH/)
  assert.doesNotMatch(serverSource, /export function createSupabaseLearningPlanGateway/)
})

test('durable adapter requires verified Supabase principals and UUID identifiers before gateway calls', async () => {
  let calls = 0
  const service = new SupabaseLearningPlanService(gateway({
    async findOwned() { calls += 1; return { data: null, error: null } },
  }))
  await assert.rejects(
    service.getOwnedPlan({ userId: 'local-owner', source: 'test-header' }, planId),
    SupabaseLearningPlanError,
  )
  await assert.rejects(
    service.getOwnedPlan({ userId: ownerId, source: 'supabase' }, 'not-a-uuid'),
    SupabaseLearningPlanError,
  )
  assert.equal(calls, 0)
})

test('durable create forwards verified ownership and a server-built 12-task blueprint', async () => {
  let forwarded
  let generatedTask = 0
  const service = new SupabaseLearningPlanService(gateway({
    async create(input) {
      forwarded = input
      return { data: domainPlan(), error: null }
    },
  }), () => tasks()[generatedTask++].id)
  const result = await service.createOwnedPlan(
    { userId: ownerId, source: 'supabase' },
    { assessmentSessionId: sessionId, goalType: 'workflows', weeklyMinutes: 180 },
  )
  assert.equal(result.ok, true)
  assert.equal(forwarded.ownerId, ownerId)
  assert.equal(forwarded.assessmentSessionId, sessionId)
  assert.equal(forwarded.tasks.length, 12)
  assert.equal(forwarded.tasks[0].ordinal, 1)
  assert.equal(forwarded.tasks[11].ordinal, 12)
})

test('durable create resumes identical requests and rejects conflicting goal or initial budget', async () => {
  let creates = 0
  const existing = domainPlan()
  const service = new SupabaseLearningPlanService(gateway({
    async findOwnedBySourceAssessment() { return { data: existing, error: null } },
    async create() { creates += 1; return { data: existing, error: null } },
  }))
  const resumed = await service.createOwnedPlan(
    { userId: ownerId, source: 'supabase' },
    { assessmentSessionId: sessionId, goalType: 'workflows', weeklyMinutes: 180 },
  )
  assert.equal(resumed.ok, true)
  assert.equal(resumed.plan.id, planId)
  assert.equal(creates, 0)

  const conflictingGoal = await service.createOwnedPlan(
    { userId: ownerId, source: 'supabase' },
    { assessmentSessionId: sessionId, goalType: 'builder', weeklyMinutes: 180 },
  )
  assert.deepEqual(conflictingGoal, { ok: false, reason: 'source_session_conflict' })
  const conflictingBudget = await service.createOwnedPlan(
    { userId: ownerId, source: 'supabase' },
    { assessmentSessionId: sessionId, goalType: 'workflows', weeklyMinutes: 240 },
  )
  assert.deepEqual(conflictingBudget, { ok: false, reason: 'source_session_conflict' })
})

test('optimistic durable conflicts map to the domain conflict without leaking gateway messages', async () => {
  const service = new SupabaseLearningPlanService(gateway({
    async transitionTask() {
      return { data: null, error: { code: '40001', message: 'raw database detail' } }
    },
  }))
  const result = await service.transitionTask(
    { userId: ownerId, source: 'supabase' },
    planId,
    tasks()[0].id,
    'completed',
    1,
  )
  assert.deepEqual(result, { ok: false, reason: 'conflict' })
})

test('durable duplicate check-ins map to the same domain conflict as memory persistence', async () => {
  const service = new SupabaseLearningPlanService(gateway({
    async submitCheckIn() {
      return { data: null, error: { code: '23505', message: 'private unique constraint detail' } }
    },
  }))
  const result = await service.submitWeeklyCheckIn(
    { userId: ownerId, source: 'supabase' },
    planId,
    1,
    'I completed the weekly proof.',
    1,
  )
  assert.deepEqual(result, { ok: false, reason: 'duplicate_check_in' })
})

test('nested Supabase exports are parsed and unsupported versions fail closed', () => {
  const plan = domainPlan()
  const stored = {
    id: plan.id,
    owner_id: plan.ownerId,
    source_assessment_session_id: plan.sourceAssessmentSessionId,
    plan_version: plan.planVersion,
    status: plan.status,
    revision: plan.revision,
    current_snapshot_version: plan.currentSnapshotVersion,
    weekly_minutes: plan.weeklyMinutes,
    snapshots: plan.snapshots.map(snapshot => ({
      version: snapshot.version,
      reason: snapshot.reason,
      source_assessment_session_id: snapshot.sourceAssessmentSessionId,
      title: snapshot.title,
      proof: snapshot.proof,
      focus_now: snapshot.focusNow,
      not_yet: snapshot.notYet,
      tasks: snapshot.tasks,
      created_at: snapshot.createdAt,
    })),
    taskProgress: plan.taskProgress.map(progress => ({
      task_id: progress.taskId,
      snapshot_version: progress.snapshotVersion,
      status: progress.status,
      updated_at: progress.updatedAt,
      completed_at: progress.completedAt,
    })),
    checkIns: [],
    adaptations: [],
    timeBudgetHistory: [],
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
    retention_expires_at: plan.retentionExpiresAt,
  }
  assert.equal(parseSupabaseLearningPlanExport(stored).snapshots[0].tasks.length, 12)
  assert.throws(
    () => parseSupabaseLearningPlanExport({ ...stored, plan_version: 'future' }),
    SupabaseLearningPlanError,
  )
})
