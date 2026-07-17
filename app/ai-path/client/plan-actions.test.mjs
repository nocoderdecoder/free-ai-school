import assert from 'node:assert/strict'
import test from 'node:test'

import { proposeCheckInAdaptation, taskSwapAlternative } from './plan-actions.ts'

test('check-in proposals are deterministic and require an explicit downstream decision', () => {
  assert.equal(proposeCheckInAdaptation('My calendar was busy and I missed two tasks.').action, 'reduce-scope')
  assert.equal(proposeCheckInAdaptation('I am stuck and confused by an error.').action, 'unblock')
  assert.equal(proposeCheckInAdaptation('This was easy; I finished early.').action, 'add-stretch')
  assert.equal(proposeCheckInAdaptation('I completed the task.').action, 'protect-pace')
})

test('task swaps stay goal-specific and bounded to the current week', () => {
  const swapped = taskSwapAlternative('leader', 2, 'Choose outcome and quality measures')
  assert.match(swapped, /^Write a decision brief/)
  assert.match(swapped, /week 3/)
})
