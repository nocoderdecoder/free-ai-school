import assert from 'node:assert/strict'
import test from 'node:test'

import { deriveRealtimeSafetyIdentifier } from './lib/realtime-safety.ts'

const salt = 'test-only-salt-that-is-long-enough-for-hmac'

test('Realtime safety identifier is stable across a user sessions and opaque', () => {
  const first = deriveRealtimeSafetyIdentifier('verified-user-123', salt)
  const second = deriveRealtimeSafetyIdentifier('verified-user-123', salt)
  assert.equal(first, second)
  assert.equal(first.length, 64)
  assert.equal(first.includes('verified-user-123'), false)
})

test('Realtime safety identifiers differ across users and deployment salts', () => {
  const first = deriveRealtimeSafetyIdentifier('verified-user-123', salt)
  assert.notEqual(first, deriveRealtimeSafetyIdentifier('verified-user-456', salt))
  assert.notEqual(first, deriveRealtimeSafetyIdentifier('verified-user-123', `${salt}-rotated`))
})

test('Realtime safety identifiers reject untrusted or weak inputs', () => {
  assert.throws(() => deriveRealtimeSafetyIdentifier('', salt), /user id/)
  assert.throws(() => deriveRealtimeSafetyIdentifier('verified-user-123', 'short'), /salt/)
})
