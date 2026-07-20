import assert from 'node:assert/strict'
import test from 'node:test'

import { buildAssessmentReport, AI_PATH_CONSENT_VERSION } from './lib/foundation.ts'
import {
  handleLearningPlanAdaptationDecision,
  handleLearningPlanCheckIn,
  handleLearningPlanCreate,
  handleLearningPlanDelete,
  handleLearningPlanExport,
  handleLearningPlanGet,
  handleLearningPlanTaskProgress,
  handleLearningPlanTimeBudget,
} from './lib/learning-plan-http.ts'
import { InMemoryLearningPlanRepository, LearningPlanService } from './lib/learning-plan.ts'
import { OwnedLearningPlanService } from './lib/learning-plan-service.ts'
import {
  AssessmentSessionService,
  InMemoryAssessmentSessionRepository,
} from './lib/session-persistence.ts'

const owner = { userId: 'plan-owner', source: 'test-header' }
const outsider = { userId: 'plan-outsider', source: 'test-header' }
const sessionInput = {
  consentVersion: AI_PATH_CONSENT_VERSION,
  locale: 'en-US',
  mode: 'text',
  goal: 'Build a safe and measurable AI workflow for weekly research.',
  goalType: 'workflows',
  targetRole: 'Product manager',
  saveTranscript: false,
}

function request(path, method, body, headers = {}) {
  return new Request(`https://app.example${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function runtime(service, principal = owner, mode = 'memory-test') {
  return {
    mode,
    principal,
    service,
    capability: {
      available: true,
      productionReady: mode === 'supabase',
      persistence: mode === 'supabase' ? 'supabase-postgres' : 'ephemeral-memory',
      reason: 'test runtime',
    },
    pendingCookies: [],
    pendingHeaders: {},
  }
}

function disabledRuntime() {
  return {
    mode: 'disabled',
    principal: null,
    service: null,
    capability: {
      available: false,
      productionReady: false,
      persistence: 'none',
      reason: 'disabled',
    },
    pendingCookies: [],
    pendingHeaders: {},
  }
}

function harness() {
  let planId = 0
  let taskId = 0
  const sessions = new AssessmentSessionService(new InMemoryAssessmentSessionRepository(), {
    idFactory: () => 'assessment-owned',
    now: () => new Date('2026-07-17T03:00:00.000Z'),
  })
  const plans = new LearningPlanService(new InMemoryLearningPlanRepository(), {
    idFactory: () => `plan-generated-${++planId}`,
    now: () => new Date('2026-07-17T03:05:00.000Z'),
  })
  const service = new OwnedLearningPlanService(sessions, plans, () => `route-task-${++taskId}`)
  return { sessions, plans, service }
}

async function completeAssessment(sessions) {
  const created = await sessions.createOwnedSession(owner, sessionInput)
  assert.equal(created.ok, true)
  const report = buildAssessmentReport({
    goal: sessionInput.goal,
    evidence: [],
    preferences: { targetLevels: { 'workflow-design': 2 }, timeBudgetHours: 4, freeOnly: true },
    generatedAt: new Date('2026-07-17T03:01:00.000Z'),
  })
  await sessions.saveOwnedReport(owner, 'assessment-owned', report)
}

async function createPlan(h) {
  await completeAssessment(h.sessions)
  const response = await handleLearningPlanCreate(request('/api/ai-path/plan', 'POST', {
    assessmentSessionId: 'assessment-owned',
    goalType: 'workflows',
    weeklyMinutes: 180,
  }), runtime(h.service))
  assert.equal(response.status, 201)
  return (await response.json()).plan
}

test('plan routes fail closed when persistence is disabled or authentication is missing', async () => {
  const h = harness()
  const body = { assessmentSessionId: 'assessment-owned', goalType: 'workflows', weeklyMinutes: 180 }
  assert.equal((await handleLearningPlanCreate(
    request('/api/ai-path/plan', 'POST', body),
    disabledRuntime(),
  )).status, 503)
  assert.equal((await handleLearningPlanCreate(
    request('/api/ai-path/plan', 'POST', body),
    runtime(h.service, null),
  )).status, 401)
})

test('plan creation requires a completed report owned by the verified principal', async () => {
  const h = harness()
  await h.sessions.createOwnedSession(owner, sessionInput)
  const body = { assessmentSessionId: 'assessment-owned', goalType: 'workflows', weeklyMinutes: 180 }
  assert.equal((await handleLearningPlanCreate(
    request('/api/ai-path/plan', 'POST', body),
    runtime(h.service),
  )).status, 409)
  assert.equal((await handleLearningPlanCreate(
    request('/api/ai-path/plan', 'POST', body),
    runtime(h.service, outsider),
  )).status, 404)

  await completeAssessment(harness().sessions)
  const completed = harness()
  const createdPlan = await createPlan(completed)
  assert.equal(createdPlan.snapshots[0].tasks.length, 12)
  assert.equal(createdPlan.weeklyMinutes, 180)
  assert.equal(createdPlan.sourceAssessmentSessionId, 'assessment-owned')
  assert.equal(createdPlan.goalType, 'workflows')
})

test('a lost create response is resumable while conflicting create inputs return 409', async () => {
  const h = harness()
  const first = await createPlan(h)
  const retryRequest = () => request('/api/ai-path/plan', 'POST', {
    assessmentSessionId: 'assessment-owned',
    goalType: 'workflows',
    weeklyMinutes: 180,
  })
  const resumed = await handleLearningPlanCreate(retryRequest(), runtime(h.service))
  assert.equal(resumed.status, 201)
  assert.equal((await resumed.json()).plan.id, first.id)

  const reloadedService = new OwnedLearningPlanService(
    h.sessions,
    h.plans,
    () => 'route-task-after-reload',
  )
  const resumedAfterServiceReload = await handleLearningPlanCreate(
    retryRequest(),
    runtime(reloadedService),
  )
  assert.equal(resumedAfterServiceReload.status, 201)
  assert.equal((await resumedAfterServiceReload.json()).plan.id, first.id)

  const conflicting = await handleLearningPlanCreate(request('/api/ai-path/plan', 'POST', {
    assessmentSessionId: 'assessment-owned',
    goalType: 'builder',
    weeklyMinutes: 240,
  }), runtime(h.service))
  assert.equal(conflicting.status, 409)
  assert.equal((await conflicting.json()).error, 'goal_type_mismatch')
})

test('task progress is owner-scoped and stale revisions return a conflict', async () => {
  const h = harness()
  const plan = await createPlan(h)
  const taskId = plan.snapshots[0].tasks[0].id
  const started = await handleLearningPlanTaskProgress(request(
    `/api/ai-path/plan/${plan.id}/tasks/${taskId}`,
    'PATCH',
    { status: 'in_progress', expectedRevision: 1 },
  ), plan.id, taskId, runtime(h.service))
  assert.equal(started.status, 200)
  assert.equal((await started.json()).plan.revision, 2)

  const stale = await handleLearningPlanTaskProgress(request(
    `/api/ai-path/plan/${plan.id}/tasks/${taskId}`,
    'PATCH',
    { status: 'completed', expectedRevision: 1 },
  ), plan.id, taskId, runtime(h.service))
  assert.equal(stale.status, 409)
  assert.equal((await stale.json()).error, 'conflict')
  assert.equal((await handleLearningPlanGet(plan.id, runtime(h.service, outsider))).status, 404)
})

test('time budgets and check-ins are bounded and return updated owner plans', async () => {
  const h = harness()
  const plan = await createPlan(h)
  const budget = await handleLearningPlanTimeBudget(request(
    `/api/ai-path/plan/${plan.id}/time-budget`,
    'PATCH',
    { weeklyMinutes: 240, reason: 'I can protect another hour.', expectedRevision: 1 },
  ), plan.id, runtime(h.service))
  assert.equal(budget.status, 200)
  assert.equal((await budget.json()).plan.weeklyMinutes, 240)

  const checkIn = await handleLearningPlanCheckIn(request(
    `/api/ai-path/plan/${plan.id}/check-ins`,
    'POST',
    { weekNumber: 1, text: 'Built the first draft.', expectedRevision: 2 },
  ), plan.id, runtime(h.service))
  assert.equal(checkIn.status, 200)
  assert.equal((await checkIn.json()).plan.checkIns.length, 1)

  const oversized = await handleLearningPlanCheckIn(request(
    `/api/ai-path/plan/${plan.id}/check-ins`,
    'POST',
    { weekNumber: 2, text: 'x'.repeat(5_000), expectedRevision: 3 },
  ), plan.id, runtime(h.service))
  assert.equal(oversized.status, 413)
})

test('proposal decisions persist only after an explicit bounded decision', async () => {
  const h = harness()
  const plan = await createPlan(h)
  const taskId = plan.snapshots[0].tasks[1].id
  const proposed = await h.service.proposeAdaptationForTest(
    owner,
    plan.id,
    'Swap one task for a smaller proof.',
    [{ type: 'swap_task', taskId, title: 'Run three examples', outcome: 'A reviewed three-row scorecard' }],
    1,
  )
  assert.equal(proposed.ok, true)
  const adaptationId = proposed.plan.adaptations[0].id
  const invalid = await handleLearningPlanAdaptationDecision(request(
    `/api/ai-path/plan/${plan.id}/adaptations/${adaptationId}`,
    'PATCH',
    { decision: 'apply', expectedRevision: 2 },
  ), plan.id, adaptationId, runtime(h.service))
  assert.equal(invalid.status, 400)

  const approved = await handleLearningPlanAdaptationDecision(request(
    `/api/ai-path/plan/${plan.id}/adaptations/${adaptationId}`,
    'PATCH',
    { decision: 'approve', expectedRevision: 2 },
  ), plan.id, adaptationId, runtime(h.service))
  assert.equal(approved.status, 200)
  const approvedPlan = (await approved.json()).plan
  assert.equal(approvedPlan.currentSnapshotVersion, 2)
  assert.equal(approvedPlan.adaptations[0].status, 'approved')
})

test('export and hard delete conceal other owners and remove the complete aggregate', async () => {
  const h = harness()
  const plan = await createPlan(h)
  assert.equal((await handleLearningPlanExport(plan.id, runtime(h.service, outsider))).status, 404)
  const exported = await handleLearningPlanExport(plan.id, runtime(h.service))
  assert.equal(exported.status, 200)
  assert.equal((await exported.json()).plan.id, plan.id)
  assert.equal((await handleLearningPlanDelete(
    new Request(`https://app.example/api/ai-path/plan/${plan.id}`, { method: 'DELETE' }),
    plan.id,
    runtime(h.service, outsider),
  )).status, 404)
  assert.equal((await handleLearningPlanDelete(
    new Request(`https://app.example/api/ai-path/plan/${plan.id}`, { method: 'DELETE' }),
    plan.id,
    runtime(h.service),
  )).status, 200)
  assert.equal((await handleLearningPlanExport(plan.id, runtime(h.service))).status, 404)
})

test('cookie-authenticated mutations require exact same-origin requests before service work', async () => {
  const h = harness()
  const body = {
    assessmentSessionId: '018f47a2-4e8d-7a32-9d10-f4b68a4ee6df',
    goalType: 'workflows',
    weeklyMinutes: 180,
  }
  assert.equal((await handleLearningPlanCreate(
    request('/api/ai-path/plan', 'POST', body),
    runtime(h.service, { userId: '018f47a2-4e8d-7a32-9d10-f4b68a4ee6de', source: 'supabase' }, 'supabase'),
  )).status, 403)
  assert.equal((await handleLearningPlanCreate(
    request('/api/ai-path/plan', 'POST', body, { origin: 'https://attacker.example' }),
    runtime(h.service, { userId: '018f47a2-4e8d-7a32-9d10-f4b68a4ee6de', source: 'supabase' }, 'supabase'),
  )).status, 403)
})
