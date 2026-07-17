import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AI_PATH_PLAN_RETENTION_DAYS,
  InMemoryLearningPlanRepository,
  LearningPlanService,
  LearningPlanValidationError,
  validateLearningPlanTasks,
} from './lib/learning-plan.ts'

const owner = { userId: 'owner-123' }
const stranger = { userId: 'stranger-456' }

function tasks(prefix = 'task') {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    ordinal: index + 1,
    week: Math.floor(index / 3) + 1,
    position: (index % 3) + 1,
    title: `Complete learning task ${index + 1}`,
    outcome: `Produce inspectable evidence for task ${index + 1}`,
  }))
}

function planInput(sessionId = 'session-123', taskPrefix = 'task') {
  return {
    sourceAssessmentSessionId: sessionId,
    goalType: 'workflows',
    title: 'A bounded four-week learning plan',
    proof: 'An artifact and evidence package that another person can inspect.',
    focusNow: 'One skill gap tied to a practical outcome.',
    notYet: 'Adjacent topics that would distract from the current proof.',
    tasks: tasks(taskPrefix),
    weeklyMinutes: 180,
  }
}

function harness(initialTime = '2026-07-17T01:00:00.000Z') {
  let tick = 0
  let now = new Date(initialTime)
  const repository = new InMemoryLearningPlanRepository()
  const service = new LearningPlanService(repository, {
    idFactory: () => `generated-${++tick}`,
    now: () => new Date(now),
  })
  return {
    repository,
    service,
    setNow(value) { now = new Date(value) },
  }
}

async function createPlan(service, input = planInput()) {
  const result = await service.createOwnedPlan(owner, input)
  assert.equal(result.ok, true)
  return result.plan
}

test('snapshots require exactly 12 uniquely placed tasks across four weeks', () => {
  assert.equal(validateLearningPlanTasks(tasks()).length, 12)
  assert.throws(() => validateLearningPlanTasks(tasks().slice(0, 11)), LearningPlanValidationError)
  const duplicateSlot = tasks()
  duplicateSlot[11] = { ...duplicateSlot[11], week: 1, position: 1 }
  assert.throws(() => validateLearningPlanTasks(duplicateSlot), /week positions must be unique/)
})

test('plans are owner-scoped, source-session unique, retained for 90 days, and defensively copied', async () => {
  const { service } = harness()
  const created = await createPlan(service)
  assert.equal(created.snapshots[0].tasks.length, 12)
  assert.equal(
    Date.parse(created.retentionExpiresAt) - Date.parse(created.createdAt),
    AI_PATH_PLAN_RETENTION_DAYS * 86_400_000,
  )
  assert.equal(await service.getOwnedPlan(stranger, created.id), null)

  const duplicate = await service.createOwnedPlan(owner, planInput())
  assert.deepEqual(duplicate, { ok: false, reason: 'source_session_exists' })

  const exported = await service.exportOwnedPlan(owner, created.id)
  exported.snapshots[0].tasks[0].title = 'mutated outside repository'
  const stored = await service.getOwnedPlan(owner, created.id)
  assert.notEqual(stored.snapshots[0].tasks[0].title, exported.snapshots[0].tasks[0].title)
})

test('task progress uses optimistic revisions and a strict state machine', async () => {
  const { service } = harness()
  const created = await createPlan(service)
  const started = await service.transitionTask(owner, created.id, 'task-1', 'in_progress', 1)
  assert.equal(started.ok, true)
  assert.equal(started.plan.revision, 2)

  const stale = await service.transitionTask(owner, created.id, 'task-2', 'completed', 1)
  assert.deepEqual(stale, { ok: false, reason: 'conflict' })

  const completed = await service.transitionTask(owner, created.id, 'task-1', 'completed', 2)
  assert.equal(completed.ok, true)
  const reopenCompleted = await service.transitionTask(owner, created.id, 'task-1', 'in_progress', 3)
  assert.deepEqual(reopenCompleted, { ok: false, reason: 'invalid_transition' })
  const strangerMutation = await service.transitionTask(stranger, created.id, 'task-2', 'completed', 3)
  assert.deepEqual(strangerMutation, { ok: false, reason: 'not_found' })
})

test('completed or archived plans are immutable through every owner mutation path', async () => {
  const { repository, service } = harness()
  const created = await createPlan(service)
  const archived = { ...created, status: 'archived', revision: 2 }
  assert.equal(await repository.replaceOwned(archived, 1), 'saved')
  assert.deepEqual(
    await service.transitionTask(owner, created.id, 'task-1', 'completed', 2),
    { ok: false, reason: 'plan_inactive' },
  )
  assert.deepEqual(
    await service.submitWeeklyCheckIn(owner, created.id, 1, 'Should not persist.', 2),
    { ok: false, reason: 'plan_inactive' },
  )
  assert.deepEqual(
    await service.adjustTimeBudget(owner, created.id, 240, 'Should not persist.', 2),
    { ok: false, reason: 'plan_inactive' },
  )
})

test('weekly check-ins and direct time adjustments are bounded and audit-preserving', async () => {
  const { service } = harness()
  const created = await createPlan(service)
  const adjusted = await service.adjustTimeBudget(owner, created.id, 240, 'I can protect another hour.', 1)
  assert.equal(adjusted.ok, true)
  assert.equal(adjusted.plan.weeklyMinutes, 240)
  assert.deepEqual(
    adjusted.plan.timeBudgetHistory.map(({ fromMinutes, toMinutes, source }) => ({ fromMinutes, toMinutes, source })),
    [{ fromMinutes: 180, toMinutes: 240, source: 'user' }],
  )
  const checkedIn = await service.submitWeeklyCheckIn(owner, created.id, 1, 'Built the first draft; evaluation remains.', 2)
  assert.equal(checkedIn.ok, true)
  const duplicate = await service.submitWeeklyCheckIn(owner, created.id, 1, 'Trying again', 3)
  assert.deepEqual(duplicate, { ok: false, reason: 'duplicate_check_in' })
  await assert.rejects(
    () => service.adjustTimeBudget(owner, created.id, 1, 'too low', 3),
    LearningPlanValidationError,
  )
})

test('adaptations do not change the plan until the owner explicitly approves', async () => {
  const { service } = harness()
  const created = await createPlan(service)
  const proposed = await service.proposeAdaptation(
    owner,
    created.id,
    'Reduce time and swap the next task based on this week.',
    [
      { type: 'adjust_time_budget', weeklyMinutes: 120, reason: 'Temporary workload increase.' },
      { type: 'swap_task', taskId: 'task-2', title: 'Run a smaller evaluation', outcome: 'Three reviewed examples' },
    ],
    1,
  )
  assert.equal(proposed.ok, true)
  assert.equal(proposed.plan.weeklyMinutes, 180)
  assert.equal(proposed.plan.currentSnapshotVersion, 1)

  const proposal = proposed.plan.adaptations[0]
  const rejected = await service.respondToAdaptation(owner, created.id, proposal.id, 'reject', 2)
  assert.equal(rejected.ok, true)
  assert.equal(rejected.plan.weeklyMinutes, 180)
  assert.equal(rejected.plan.currentSnapshotVersion, 1)

  const secondProposal = await service.proposeAdaptation(
    owner,
    created.id,
    'Use a smaller task and a sustainable time budget.',
    [
      { type: 'adjust_time_budget', weeklyMinutes: 120, reason: 'Temporary workload increase.' },
      { type: 'swap_task', taskId: 'task-2', title: 'Run a smaller evaluation', outcome: 'Three reviewed examples' },
    ],
    3,
  )
  assert.equal(secondProposal.ok, true)
  const approved = await service.respondToAdaptation(
    owner,
    created.id,
    secondProposal.plan.adaptations.at(-1).id,
    'approve',
    4,
  )
  assert.equal(approved.ok, true)
  assert.equal(approved.plan.weeklyMinutes, 120)
  assert.equal(approved.plan.currentSnapshotVersion, 2)
  assert.equal(approved.plan.snapshots.length, 2)
  assert.equal(approved.plan.snapshots[0].tasks[1].title, 'Complete learning task 2')
  assert.equal(approved.plan.snapshots[1].tasks[1].title, 'Run a smaller evaluation')
  assert.equal(approved.plan.timeBudgetHistory.at(-1).source, 'adaptation')
})

test('adaptations can swap at most three incomplete tasks', async () => {
  const { service } = harness()
  const created = await createPlan(service)
  await assert.rejects(
    () => service.proposeAdaptation(
      owner,
      created.id,
      'Too many changes at once.',
      [1, 2, 3, 4].map((ordinal) => ({
        type: 'swap_task',
        taskId: `task-${ordinal}`,
        title: `Replacement ${ordinal}`,
        outcome: `Replacement evidence ${ordinal}`,
      })),
      1,
    ),
    /at most three tasks/,
  )
})

test('reassessment appends immutable version history and supersedes pending adaptations', async () => {
  const { service } = harness()
  const created = await createPlan(service)
  const proposed = await service.proposeAdaptation(
    owner,
    created.id,
    'A pending proposal.',
    [{ type: 'swap_task', taskId: 'task-3', title: 'A smaller task', outcome: 'A smaller artifact' }],
    1,
  )
  assert.equal(proposed.ok, true)
  const reassessed = await service.addReassessmentSnapshot(
    owner,
    created.id,
    { ...planInput('session-789', 'reassessed'), weeklyMinutes: undefined },
    2,
  )
  assert.equal(reassessed.ok, true)
  assert.equal(reassessed.plan.currentSnapshotVersion, 2)
  assert.deepEqual(reassessed.plan.snapshots.map(({ reason }) => reason), ['initial', 'reassessment'])
  assert.equal(reassessed.plan.adaptations[0].status, 'superseded')
  assert.equal(reassessed.plan.taskProgress.filter(({ snapshotVersion }) => snapshotVersion === 2).length, 12)
})

test('owner deletion cascades at the repository boundary and expired plans can be purged', async () => {
  const lifecycle = harness()
  const first = await createPlan(lifecycle.service)
  assert.equal(await lifecycle.service.deleteOwnedPlan(stranger, first.id), false)
  assert.equal(await lifecycle.service.deleteOwnedPlan(owner, first.id), true)
  assert.equal(await lifecycle.service.getOwnedPlan(owner, first.id), null)

  const expiring = harness()
  const second = await createPlan(expiring.service)
  expiring.setNow('2027-01-14T01:00:01.000Z')
  assert.equal(await expiring.service.purgeExpiredPlans(), 1)
  assert.equal(await expiring.service.getOwnedPlan(owner, second.id), null)
})
