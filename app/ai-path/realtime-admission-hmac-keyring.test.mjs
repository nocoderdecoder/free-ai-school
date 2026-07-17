import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AI_PATH_REALTIME_HMAC_ROTATION_CONTRACT_VERSION,
  AI_PATH_REALTIME_HMAC_ROTATION_POLICY,
  createRealtimeAdmissionHmacContinuitySet,
  requireRealtimeAdmissionStoredBinding,
  requireRealtimeAdmissionWriteBinding,
} from './lib/realtime-admission-hmac-keyring.ts'
import { createVerifiedRealtimeAdmissionBinding } from './lib/realtime-admission.ts'

const users = {
  alice: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  bob: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
}
const sessionId = '11111111-1111-4111-8111-111111111111'
const failClosed = /failed closed/

function encodedSecret(seed) {
  return Buffer.from(Array.from({ length: 32 }, (_, index) => (seed + index * 17) % 256)).toString('base64url')
}

function key(version, seed) {
  return { version, encoding: 'base64url', secret: encodedSecret(seed) }
}

function policy(overrides = {}) {
  return {
    contractVersion: AI_PATH_REALTIME_HMAC_ROTATION_CONTRACT_VERSION,
    activeVersion: 'v2',
    minimumAcceptedVersion: 'v1',
    acceptedPreviousVersions: ['v1'],
    standbyVersion: null,
    ...overrides,
  }
}

function continuity(overrides = {}) {
  return createRealtimeAdmissionHmacContinuitySet({
    principal: { source: 'supabase', userId: users.alice },
    ownedSession: { id: sessionId, ownerId: users.alice, status: 'consented' },
    policy: policy(),
    keys: [key('v1', 1), key('v2', 2)],
    ...overrides,
  })
}

test('initial reviewed policy is single-version and cannot be activated by configuration', () => {
  assert.deepEqual(AI_PATH_REALTIME_HMAC_ROTATION_POLICY, {
    contractVersion: AI_PATH_REALTIME_HMAC_ROTATION_CONTRACT_VERSION,
    activeVersion: 'v1',
    minimumAcceptedVersion: 'v1',
    acceptedPreviousVersions: [],
    standbyVersion: null,
  })
  assert.equal(Object.isFrozen(AI_PATH_REALTIME_HMAC_ROTATION_POLICY), true)
})

test('overlap derives stable old bindings and writes only the reviewed active version', () => {
  const first = continuity()
  const again = continuity({ ownedSession: { id: sessionId, ownerId: users.alice, status: 'connecting' } })
  assert.equal(first.writeBinding.keyVersion, 'v2')
  assert.deepEqual(first.lookupBindings.map(binding => binding.keyVersion), ['v2', 'v1'])
  assert.deepEqual(first.lookupBindings, again.lookupBindings)
  assert.equal(requireRealtimeAdmissionWriteBinding(first, 'v2'), first.writeBinding)
  assert.equal(Object.isFrozen(first), true)
  assert.equal(Object.isFrozen(first.lookupBindings), true)
  assert.equal(JSON.stringify(first).includes(users.alice), false)
  assert.equal(JSON.stringify(first).includes(sessionId), false)
  assert.equal(JSON.stringify(first).includes(encodedSecret(1)), false)
})

test('legacy v1 bridge preserves the established string-secret derivation exactly', () => {
  const legacySecret = 'legacy-v1-secret-ABCDEFGHIJKLMNOPQRSTUVWXYZ-0123456789'
  const set = createRealtimeAdmissionHmacContinuitySet({
    principal: { source: 'supabase', userId: users.alice },
    ownedSession: { id: sessionId, ownerId: users.alice, status: 'consented' },
    policy: AI_PATH_REALTIME_HMAC_ROTATION_POLICY,
    keys: [{ version: 'v1', encoding: 'legacy-utf8', secret: legacySecret }],
  })
  const established = createVerifiedRealtimeAdmissionBinding({
    principal: { source: 'supabase', userId: users.alice },
    ownedSession: { id: sessionId, ownerId: users.alice, status: 'consented' },
    secret: legacySecret,
  })
  assert.equal(set.writeBinding.userKey, established.userKey)
  assert.equal(set.writeBinding.sessionKey, established.sessionKey)
  assert.throws(() => continuity({
    keys: [key('v1', 1), { version: 'v2', encoding: 'legacy-utf8', secret: legacySecret }],
  }), failClosed)
})

test('pre-staged future version is readable but cannot write before activation', () => {
  const prepared = continuity({
    policy: policy({ standbyVersion: 'v3' }),
    keys: [key('v1', 1), key('v2', 2), key('v3', 3)],
  })
  assert.deepEqual(prepared.lookupBindings.map(binding => binding.keyVersion), ['v2', 'v3', 'v1'])
  assert.throws(() => requireRealtimeAdmissionWriteBinding(prepared, 'v3'), failClosed)
})

test('downgrade, unknown, and retired write versions fail closed', () => {
  const set = continuity()
  assert.throws(() => requireRealtimeAdmissionWriteBinding(set, 'v1'), failClosed)
  assert.throws(() => requireRealtimeAdmissionWriteBinding(set, 'v3'), failClosed)
  assert.throws(() => requireRealtimeAdmissionWriteBinding(set, 'garbage'), failClosed)
})

test('stored lookup requires one exact version-bound opaque pair', () => {
  const set = continuity()
  const old = set.lookupBindings.find(binding => binding.keyVersion === 'v1')
  assert.equal(requireRealtimeAdmissionStoredBinding(set, old), old)
  assert.throws(() => requireRealtimeAdmissionStoredBinding(set, { ...old, keyVersion: 'v3' }), failClosed)
  assert.throws(() => requireRealtimeAdmissionStoredBinding(set, { ...old, keyVersion: 'v0' }), failClosed)
  assert.throws(() => requireRealtimeAdmissionStoredBinding(set, { ...old, userKey: set.writeBinding.userKey }), failClosed)
  assert.throws(() => requireRealtimeAdmissionStoredBinding(set, { ...old, sessionKey: 'f'.repeat(64) }), failClosed)
})

test('keyring rejects weak, malformed, noncanonical, duplicate, and unexpected secrets', () => {
  const cases = [
    [key('v1', 1), { version: 'v2', encoding: 'hex', secret: '00'.repeat(32) }],
    [key('v1', 1), { version: 'v2', encoding: 'base64url', secret: 'a'.repeat(42) }],
    [key('v1', 1), { version: 'v2', encoding: 'base64url', secret: `${encodedSecret(2)}=` }],
    [{ version: 'v1', encoding: 'legacy-utf8', secret: ` ${'varied-secret-ABCDEFGHIJKLMNOPQRSTUVWXYZ-1234567890'} ` }, key('v2', 2)],
    [key('v1', 1), { ...key('v2', 2), secret: encodedSecret(1) }],
    [key('v1', 1), key('v3', 3)],
  ]
  for (const keys of cases) assert.throws(() => continuity({ keys }), failClosed)
  assert.throws(() => continuity({ keys: [key('v1', 1), null] }), failClosed)
})

test('ambiguous key versions and noncanonical policy ordering fail closed', () => {
  assert.throws(() => continuity({
    policy: policy({ activeVersion: 'v01' }),
  }), failClosed)
  assert.throws(() => continuity({
    policy: { ...policy(), unexpected: true },
  }), failClosed)
  assert.throws(() => continuity({
    keys: [key('v1', 1), { ...key('v2', 2), unexpected: true }],
  }), failClosed)
  assert.throws(() => continuity({ keys: [key('v1', 1), key('v1', 2)] }), failClosed)
  assert.throws(() => continuity({
    policy: policy({ acceptedPreviousVersions: ['v1', 'v1'] }),
    keys: [key('v1', 1), key('v2', 2), key('v1', 3)],
  }), failClosed)
  assert.throws(() => continuity({
    policy: policy({ activeVersion: 'v3', acceptedPreviousVersions: ['v1', 'v2'] }),
    keys: [key('v1', 1), key('v2', 2), key('v3', 3)],
  }), failClosed)
  assert.throws(() => continuity({
    policy: policy({ standbyVersion: 'v2' }),
    keys: [key('v1', 1), key('v2', 2), key('v2', 3)],
  }), failClosed)
})

test('minimum accepted version prevents retention of downgraded keys', () => {
  assert.throws(() => continuity({
    policy: policy({ minimumAcceptedVersion: 'v2' }),
  }), failClosed)

  const retired = continuity({
    policy: policy({ minimumAcceptedVersion: 'v2', acceptedPreviousVersions: [] }),
    keys: [key('v2', 2)],
  })
  assert.deepEqual(retired.lookupBindings.map(binding => binding.keyVersion), ['v2'])
})

test('derivation requires a verified Supabase owner and reservable session', () => {
  assert.throws(() => continuity({ principal: { source: 'anonymous', userId: users.alice } }), failClosed)
  assert.throws(() => continuity({ ownedSession: { id: sessionId, ownerId: users.bob, status: 'consented' } }), failClosed)
  assert.throws(() => continuity({ ownedSession: { id: sessionId, ownerId: users.alice, status: 'complete' } }), failClosed)
  assert.throws(() => continuity({ principal: { source: 'supabase', userId: 'not-a-uuid' } }), failClosed)
})

test('same raw identity is unlinkable across versions and different identities', () => {
  const alice = continuity()
  const bob = continuity({
    principal: { source: 'supabase', userId: users.bob },
    ownedSession: { id: '22222222-2222-4222-8222-222222222222', ownerId: users.bob, status: 'consented' },
  })
  const [active, previous] = alice.lookupBindings
  assert.notEqual(active.userKey, previous.userKey)
  assert.notEqual(active.sessionKey, previous.sessionKey)
  assert.notEqual(active.userKey, bob.writeBinding.userKey)
  assert.notEqual(active.sessionKey, bob.writeBinding.sessionKey)
})
