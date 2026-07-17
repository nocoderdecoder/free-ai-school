import assert from 'node:assert/strict'
import test from 'node:test'

import { getPlanBlueprint } from './lib/plan.ts'

test('every supported goal receives a distinct complete four-week plan', () => {
  const goals = ['workflows', 'builder', 'career', 'leader', 'foundations', 'unsure']
  const plans = goals.map(getPlanBlueprint)
  assert.equal(new Set(plans.map(plan => plan.title)).size, goals.length)
  for (const plan of plans) {
    assert.equal(plan.weeks.length, 4)
    assert.equal(plan.weeks.flatMap(week => week.tasks).length, 12)
    assert.ok(plan.proof.length > 30)
    assert.ok(plan.firstTask.length > 10)
  }
})

test('unknown goal types get the exploration plan and callers cannot mutate templates', () => {
  const first = getPlanBlueprint('not-a-goal')
  first.weeks[0].tasks[0] = 'mutated'
  const second = getPlanBlueprint('unsure')
  assert.notEqual(second.weeks[0].tasks[0], 'mutated')
  assert.equal(first.title, second.title)
})
