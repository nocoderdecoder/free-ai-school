import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_REALTIME_ADMISSION_POLICY_VERSION,
  defineRealtimeAdmissionPolicyContract,
} from './lib/realtime-admission-policy-contract.ts'

const limits = {
  maxGlobalConcurrent: 2,
  maxUserConcurrent: 1,
  maxUserDailyCents: 100,
  maxGlobalDailyCents: 1_000,
  maxReservationCents: 100,
  reservationTtlMs: 120_000,
}

test('policy contract derives one stable identifier and freezes every level', () => {
  const contract = defineRealtimeAdmissionPolicyContract({
    version: AI_PATH_REALTIME_ADMISSION_POLICY_VERSION,
    limits,
  })

  assert.deepEqual(contract, {
    version: '2026-07-17.v1',
    policyId: '2026-07-17.v1|gc=2|uc=1|udc=100|gdc=1000|rc=100|ttl=120000',
    limits,
  })
  assert.equal(Object.isFrozen(contract), true)
  assert.equal(Object.isFrozen(contract.limits), true)
  assert.throws(() => { contract.limits.maxGlobalConcurrent = 9 }, TypeError)
})

test('contract rejects unknown keys, invalid versions, and every unbounded relationship', () => {
  const invalidContracts = [
    { version: 'v1', limits },
    { version: '2026-07-17.v0', limits },
    { version: '2026-02-30.v1', limits },
    { version: '2026-07-17.v1234567890', limits },
    { version: '2026-07-17.v1', limits, override: true },
    { version: '2026-07-17.v1', limits: { ...limits, unexpected: 1 } },
    { version: '2026-07-17.v1', limits: { ...limits, maxGlobalConcurrent: 0 } },
    { version: '2026-07-17.v1', limits: { ...limits, maxUserConcurrent: 3 } },
    { version: '2026-07-17.v1', limits: { ...limits, maxGlobalDailyCents: 99 } },
    { version: '2026-07-17.v1', limits: { ...limits, maxReservationCents: 101 } },
    { version: '2026-07-17.v1', limits: { ...limits, reservationTtlMs: 29_999 } },
    { version: '2026-07-17.v1', limits: { ...limits, reservationTtlMs: 14_400_001 } },
  ]

  for (const input of invalidContracts) {
    assert.throws(() => defineRealtimeAdmissionPolicyContract(input))
  }
})

test('durable construction has no caller policy seam and remains doubly latched', async () => {
  const policySource = await readFile(
    new URL('./lib/realtime-admission-policy.server.ts', import.meta.url),
    'utf8',
  )
  const factorySource = await readFile(
    new URL('./lib/realtime-admission-supabase.server.ts', import.meta.url),
    'utf8',
  )
  assert.match(policySource, /import 'server-only'/)
  assert.match(policySource, /AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH = false as const/)
  assert.match(policySource, /maxGlobalConcurrent: 2/)
  assert.match(policySource, /maxUserConcurrent: 1/)
  assert.match(factorySource, /AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH = false as const/)
  assert.match(factorySource, /!AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH/)
  assert.match(factorySource, /activation\.policyVersion !== AI_PATH_REALTIME_ADMISSION_POLICY\.version/)
  assert.match(factorySource, /activation\.policyId !== AI_PATH_REALTIME_ADMISSION_POLICY\.policyId/)
  assert.match(factorySource, /AI_PATH_REALTIME_ADMISSION_POLICY,/)
  assert.match(factorySource, /activation\.credentialScope !== 'authenticated-intent\+service-role'/)
  assert.doesNotMatch(factorySource, /policy:\s*RealtimeAdmissionPolicy/)
  assert.doesNotMatch(factorySource, /process\.env|fetch\s*\(|console\./)
})
