import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { AIPathApiError, createDiagnosticResult } from './client/api.ts'
import { handleDiagnosticPost } from './lib/diagnostic-http.ts'
import {
  INITIAL_USE_CASE_INTAKE,
  composeDiagnosticResult,
} from './lib/diagnostic.ts'
import {
  AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION,
  parseDiagnosticSubmissionEnvelope,
} from './lib/diagnostic-storage-consent.ts'

const origin = 'https://advisor.example'
const ownerId = '10000000-0000-4000-8000-000000000001'
const idempotencyKey = '20000000-0000-4000-8000-000000000001'

const intake = {
  ...structuredClone(INITIAL_USE_CASE_INTAKE),
  outcome: { desiredOutcome: 'Help our sales team prepare accurate account briefs before customer calls.' },
  workflow: { currentProcess: 'A manager searches several approved systems and manually creates each account brief.' },
  specification: {
    inputs: 'Approved CRM fields and public notes',
    output: 'A reviewable one-page account brief',
    success: 'At least 9 of 10 facts link to an approved source.',
  },
  experience: { level: 'guided', evidence: '', artifactUrl: '' },
  risk: { dataSensitivity: 'internal', existingSystems: 'CRM', consequence: 'moderate', humanApproval: 'yes' },
  constraints: {
    role: 'Sales manager', codingComfort: 'modify-examples', weeklyHours: 3,
    approach: 'either', teamMode: 'team', budget: 'free-only',
  },
}

function submission(acknowledged, key = acknowledged ? idempotencyKey : null) {
  return {
    intake,
    storageConsent: { acknowledged, version: AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION },
    idempotencyKey: key,
  }
}

function request(body) {
  return new Request(`${origin}/api/ai-path/diagnostic`, {
    method: 'POST',
    headers: { origin, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

test('versioned storage envelope requires affirmative consent and a UUID only when saving', () => {
  assert.equal(parseDiagnosticSubmissionEnvelope(submission(false)).ok, true)
  assert.equal(parseDiagnosticSubmissionEnvelope(submission(true)).ok, true)
  assert.equal(parseDiagnosticSubmissionEnvelope(submission(false, idempotencyKey)).ok, false)
  assert.equal(parseDiagnosticSubmissionEnvelope(submission(true, 'not-a-uuid')).ok, false)
  assert.equal(parseDiagnosticSubmissionEnvelope({
    ...submission(true),
    storageConsent: { acknowledged: true, version: 'future-version' },
  }).ok, false)
})

test('an unsaved submission returns the deterministic result without touching persistence', async () => {
  let calls = 0
  const response = await handleDiagnosticPost(request(submission(false)), {
    verifiedOwnerId: ownerId,
    persist: async () => {
      calls += 1
      throw new Error('must not persist')
    },
  })
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.result.kind, 'use-case-blueprint')
  assert.equal(body.generatedBy, 'deterministic-server-policy')
  assert.equal(body.persisted, false)
  assert.equal(body.storage, null)
  assert.equal(calls, 0)
})

test('saving requires a verified user and persists only the server-composed result', async () => {
  let calls = 0
  const unauthenticated = await handleDiagnosticPost(request(submission(true)), {
    persist: async () => { throw new Error('must not persist') },
  })
  assert.equal(unauthenticated.status, 401)

  const response = await handleDiagnosticPost(request(submission(true)), {
    verifiedOwnerId: ownerId,
    persist: async value => {
      calls += 1
      assert.equal(value.ownerId, ownerId)
      assert.equal(value.idempotencyKey, idempotencyKey)
      assert.equal(value.intake.path, 'use-case')
      assert.equal(value.result.kind, 'use-case-blueprint')
      assert.equal(value.result.policyVersion, '2026-07-18.v2')
      assert.equal(value.storageConsent, true)
      assert.equal(value.privacyNoticeVersion, AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION)
      return {
        sessionId: '30000000-0000-4000-8000-000000000001',
        intakeDigest: 'a'.repeat(64),
        resultDigest: 'b'.repeat(64),
        retentionExpiresAt: '2026-10-16T12:00:00.000Z',
        replayed: false,
      }
    },
  })
  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(calls, 1)
  assert.equal(body.persisted, true)
  assert.deepEqual(body.storage, {
    sessionId: '30000000-0000-4000-8000-000000000001',
    retentionExpiresAt: '2026-10-16T12:00:00.000Z',
    replayed: false,
  })
})

test('requested storage fails closed when its runtime is unavailable or errors', async () => {
  const unavailable = await handleDiagnosticPost(request(submission(true)), {
    verifiedOwnerId: ownerId,
    persist: async () => null,
  })
  assert.equal(unavailable.status, 503)
  assert.deepEqual(await unavailable.json(), { error: 'diagnostic_persistence_unavailable' })

  const failed = await handleDiagnosticPost(request(submission(true)), {
    verifiedOwnerId: ownerId,
    persist: async () => { throw new Error('private provider detail') },
  })
  assert.equal(failed.status, 503)
  assert.deepEqual(await failed.json(), { error: 'diagnostic_persistence_unavailable' })
})

test('browser submits the versioned consent envelope and refuses a false saved receipt', async () => {
  const previousFetch = globalThis.fetch
  const result = composeDiagnosticResult(intake)
  assert.ok(result)
  let sent
  globalThis.fetch = async (url, options) => {
    sent = { url, options }
    return Response.json({ result, generatedBy: 'deterministic-server-policy', persisted: true })
  }
  try {
    await createDiagnosticResult(intake, { save: true, idempotencyKey })
    assert.equal(sent.url, '/api/ai-path/diagnostic')
    assert.deepEqual(JSON.parse(sent.options.body), submission(true))

    globalThis.fetch = async () => Response.json({
      result, generatedBy: 'deterministic-server-policy', persisted: false,
    })
    await assert.rejects(
      createDiagnosticResult(intake, { save: true, idempotencyKey }),
      error => error instanceof AIPathApiError && error.status === 503,
    )
  } finally {
    globalThis.fetch = previousFetch
  }
})

test('application wiring keeps storage opt-in and every production gate closed', async () => {
  const [runtime, route, client, advisor] = await Promise.all([
    readFile(new URL('./lib/diagnostic-persistence-runtime.server.ts', import.meta.url), 'utf8'),
    readFile(new URL('../api/ai-path/diagnostic/route.ts', import.meta.url), 'utf8'),
    readFile(new URL('./client/api.ts', import.meta.url), 'utf8'),
    readFile(new URL('./AdvisorApp.tsx', import.meta.url), 'utf8'),
  ])
  const latch = runtime.indexOf('if (!AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_LATCH)')
  assert.ok(latch >= 0)
  assert.ok(runtime.indexOf('process.env.SUPABASE_SERVICE_ROLE_KEY') > latch)
  assert.ok(runtime.indexOf('createClient(', latch) > runtime.indexOf('if (!capability.available) return null', latch))
  assert.match(route, /persist: async input =>[\s\S]+createConsumerDiagnosticPersistenceRuntime\(\)/)
  assert.match(client, /storageConsent:[\s\S]+acknowledged: storage\.save[\s\S]+AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION/)
  assert.match(advisor, /const \[storageConsent, setStorageConsent\] = useState\(false\)/)
  assert.match(advisor, /disabled=!\{?storagePersistenceAvailable|disabled=\{!storagePersistenceAvailable/)
  assert.match(advisor, /crypto\.randomUUID\(\)/)
  assert.match(advisor, /storageSubmission\.current\.fingerprint !== fingerprint/)
})
