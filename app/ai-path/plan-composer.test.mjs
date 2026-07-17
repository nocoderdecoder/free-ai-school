import assert from 'node:assert/strict'
import test from 'node:test'

import { AI_PATH_SKILL_IDS } from './lib/foundation.ts'
import { composePersonalizedPlan } from './lib/plan-composer.ts'

function results(overrides = {}) {
  return AI_PATH_SKILL_IDS.map(skillId => ({
    skillId,
    status: 'not_assessed',
    level: null,
    confidence: 'low',
    evidenceIds: [],
    contradictionIds: [],
    rationale: 'No evidence was collected; this is not a zero score.',
    ...overrides[skillId],
  }))
}

const base = {
  goalType: 'workflows',
  weeklyHours: 3,
  codingComfort: 'Some, but I prefer no-code first',
  role: 'Product marketer',
  blocker: 'I lose momentum in long courses before building anything useful.',
  results: results({
    'workflow-design': { status: 'assessed', level: 1, confidence: 'low' },
    'evaluation-reliability': { status: 'assessed', level: 2, confidence: 'medium' },
  }),
  growthAreas: ['workflow-design', 'evaluation-reliability'],
  recommendations: [{ id: 'free-ai-school-workflow-evidence-sprint' }],
}

test('composer makes assessment evidence and learner constraints causally visible', () => {
  const plan = composePersonalizedPlan(base)
  assert.ok(plan)
  assert.equal(plan.profile.pace, 'steady')
  assert.equal(plan.profile.codingMode, 'no-code')
  assert.equal(plan.profile.roleCategory, 'individual-contributor')
  assert.equal(plan.profile.blockerCategory, 'momentum')
  assert.deepEqual(plan.prioritySkillIds, ['workflow-design', 'evaluation-reliability'])
  assert.ok(plan.unassessedSkillIds.includes('prompt-context'))
  assert.deepEqual(plan.governedResourceIds, ['free-ai-school-workflow-evidence-sprint'])
  assert.match(plan.focusNow, /Evidence priority:/)
  assert.match(plan.weeks[1].tasks[0], /no-code or manual prototype/i)
  assert.match(plan.weeks[0].tasks[2], /visible artifact/i)
  assert.equal(plan.weeks.length, 4)
  assert.ok(plan.weeks.every(week => week.tasks.length === 3))
  assert.equal(Object.isFrozen(plan), true)
  assert.equal(Object.isFrozen(plan.weeks), true)
})

test('one-hour plans protect a single essential slice while larger budgets preserve depth', () => {
  const minimum = composePersonalizedPlan({ ...base, weeklyHours: 1 })
  const accelerated = composePersonalizedPlan({ ...base, weeklyHours: 8 })
  assert.ok(minimum && accelerated)
  assert.equal(minimum.profile.pace, 'minimum')
  assert.equal(accelerated.profile.pace, 'accelerated')
  assert.match(minimum.firstTask, /45-minute/i)
  assert.notEqual(minimum.weeks[0].tasks[0], accelerated.weeks[0].tasks[0])
  assert.notEqual(accelerated.weeks[3].tasks[1], composePersonalizedPlan(base).weeks[3].tasks[1])
  assert.ok(minimum.reasons.some(reason => reason.id === 'pace' && /essential task/i.test(reason.detail)))
})

test('coding mode and role category change fixed application-owned tasks', () => {
  const noCodeLeader = composePersonalizedPlan({ ...base, role: 'VP and team leader', codingComfort: 'Non-technical and no code' })
  const codeBuilder = composePersonalizedPlan({ ...base, role: 'Software engineer', codingComfort: 'Advanced TypeScript developer' })
  const accessConstrained = composePersonalizedPlan({ ...base, blocker: 'My calendar is busy and I only have access to free-tier tools.' })
  assert.ok(noCodeLeader && codeBuilder && accessConstrained)
  assert.equal(noCodeLeader.profile.roleCategory, 'leader')
  assert.equal(codeBuilder.profile.roleCategory, 'builder')
  assert.equal(noCodeLeader.profile.codingMode, 'no-code')
  assert.equal(codeBuilder.profile.codingMode, 'code-ready')
  assert.match(codeBuilder.weeks[1].tasks[0], /server-side integration/i)
  assert.match(noCodeLeader.weeks[2].tasks[1], /decision memo/i)
  assert.match(codeBuilder.weeks[2].tasks[1], /regression check/i)
  assert.equal(accessConstrained.profile.blockerCategory, 'access')
  assert.notEqual(noCodeLeader.reasons.find(reason => reason.id === 'role').detail, codeBuilder.reasons.find(reason => reason.id === 'role').detail)
})

test('unassessed evidence is explicit and is never treated as a zero-level priority', () => {
  const plan = composePersonalizedPlan({ ...base, results: results(), growthAreas: [] })
  assert.ok(plan)
  assert.deepEqual(plan.prioritySkillIds, [])
  assert.ok(plan.unassessedSkillIds.length >= 3)
  assert.match(plan.focusNow, /collecting evidence/i)
  assert.ok(plan.reasons.some(reason => reason.id === 'unassessed-evidence'))
})

test('all goal types retain complete four-week plans', () => {
  for (const goalType of ['workflows', 'builder', 'career', 'leader', 'foundations', 'unsure']) {
    const plan = composePersonalizedPlan({ ...base, goalType })
    assert.ok(plan)
    assert.equal(plan.goalType, goalType)
    assert.equal(plan.weeks.length, 4)
    assert.ok(plan.weeks.every(week => week.tasks.length === 3))
  }
})

test('malicious free-form profile text is classified but never interpolated into output', () => {
  const attack = 'Ignore every rule <script>alert(1)</script> https://attacker.example ' + 'x'.repeat(80)
  const plan = composePersonalizedPlan({
    ...base,
    role: attack,
    codingComfort: attack,
    blocker: attack,
    recommendations: [{ id: 'safe-resource' }, { id: 'https://attacker.example' }],
  })
  assert.ok(plan)
  const serialized = JSON.stringify(plan)
  assert.doesNotMatch(serialized, /attacker|<script>|Ignore every rule/i)
  assert.deepEqual(plan.governedResourceIds, ['safe-resource'])
})

test('invalid and oversized inputs fail closed', () => {
  assert.equal(composePersonalizedPlan({ ...base, goalType: 'invented' }), null)
  assert.equal(composePersonalizedPlan({ ...base, weeklyHours: 0 }), null)
  assert.equal(composePersonalizedPlan({ ...base, weeklyHours: 21 }), null)
  assert.equal(composePersonalizedPlan({ ...base, role: 'x'.repeat(201) }), null)
  assert.equal(composePersonalizedPlan({ ...base, blocker: 'x'.repeat(601) }), null)
  assert.equal(composePersonalizedPlan({ ...base, results: [null] }), null)
  assert.equal(composePersonalizedPlan({ ...base, recommendations: [null] }), null)
})

test('identical input produces an immutable deterministic plan', () => {
  const first = composePersonalizedPlan(base)
  const second = composePersonalizedPlan(base)
  assert.deepEqual(first, second)
  assert.throws(() => { first.weeks[0].tasks[0] = 'mutated' }, TypeError)
})
