import assert from 'node:assert/strict'
import test from 'node:test'

import { AI_PATH_CONSENT_VERSION, buildAssessmentReport } from './lib/foundation.ts'
import {
  AssessmentSessionService,
  InMemoryAssessmentSessionRepository,
  parseTestPrincipal,
  resolveSessionPersistenceCapability,
} from './lib/session-persistence.ts'

const sessionInput = {
  consentVersion: AI_PATH_CONSENT_VERSION,
  locale: 'en-US',
  mode: 'text',
  goal: 'Build a reliable weekly AI research and evaluation workflow.',
  targetRole: 'Product manager',
  saveTranscript: false,
}

const localCapability = resolveSessionPersistenceCapability({
  nodeEnv: 'test',
  store: 'memory',
  enableTestAuth: 'true',
})

test('production persistence stays disabled even when local adapter flags are present', () => {
  const capability = resolveSessionPersistenceCapability({
    nodeEnv: 'production',
    store: 'memory',
    enableTestAuth: 'true',
  })
  assert.equal(capability.available, false)
  assert.equal(capability.productionReady, false)
  assert.equal(capability.persistence, 'none')
})

test('memory persistence and test authentication require explicit non-production gates', () => {
  assert.equal(resolveSessionPersistenceCapability({ nodeEnv: 'test' }).available, false)
  assert.equal(resolveSessionPersistenceCapability({ nodeEnv: 'test', store: 'memory' }).available, false)
  assert.equal(localCapability.available, true)
  assert.equal(localCapability.productionReady, false)

  assert.deepEqual(parseTestPrincipal('user_123', localCapability), {
    userId: 'user_123',
    source: 'test-header',
  })
  assert.equal(parseTestPrincipal('user_123', resolveSessionPersistenceCapability({ nodeEnv: 'production' })), null)
  assert.equal(parseTestPrincipal('bad user id', localCapability), null)
})

test('repository contract scopes reads to owners and enforces one active session per owner', async () => {
  const repository = new InMemoryAssessmentSessionRepository()
  let id = 0
  const service = new AssessmentSessionService(repository, {
    idFactory: () => `session-${++id}`,
    now: () => new Date('2026-07-16T12:00:00.000Z'),
  })
  const alice = { userId: 'alice_123', source: 'test-header' }
  const bob = { userId: 'bob_123', source: 'test-header' }

  const aliceCreated = await service.createOwnedSession(alice, sessionInput)
  assert.equal(aliceCreated.ok, true)
  if (!aliceCreated.ok) return

  const duplicate = await service.createOwnedSession(alice, sessionInput)
  assert.deepEqual(duplicate, {
    ok: false,
    reason: 'active_session_exists',
    sessionId: aliceCreated.session.id,
  })

  const bobCreated = await service.createOwnedSession(bob, sessionInput)
  assert.equal(bobCreated.ok, true)
  assert.equal(await service.getOwnedSession(bob, aliceCreated.session.id), null)
  assert.equal((await service.getOwnedSession(alice, aliceCreated.session.id))?.ownerId, alice.userId)
})

test('repository contract never saves or reveals a report across owners', async () => {
  const repository = new InMemoryAssessmentSessionRepository()
  let id = 0
  const service = new AssessmentSessionService(repository, {
    idFactory: () => `session-report-${++id}`,
    now: () => new Date('2026-07-16T13:00:00.000Z'),
  })
  const alice = { userId: 'alice_456', source: 'test-header' }
  const bob = { userId: 'bob_456', source: 'test-header' }
  const created = await service.createOwnedSession(alice, sessionInput)
  assert.equal(created.ok, true)
  if (!created.ok) return

  const report = buildAssessmentReport({
    goal: sessionInput.goal,
    evidence: [],
    preferences: {
      targetLevels: { foundations: 2 },
      timeBudgetHours: 8,
      freeOnly: true,
    },
  })

  assert.equal(await service.saveOwnedReport(bob, created.session.id, report), null)
  const saved = await service.saveOwnedReport(alice, created.session.id, report)
  assert.equal(saved?.report?.reportVersion, report.reportVersion)
  assert.equal(saved?.status, 'complete')
  assert.equal((await service.getOwnedSession(bob, created.session.id)), null)

  report.goal = 'mutated after persistence'
  const reread = await service.getOwnedSession(alice, created.session.id)
  assert.equal(reread?.report?.goal, sessionInput.goal)

  const nextAssessment = await service.createOwnedSession(alice, sessionInput)
  assert.equal(nextAssessment.ok, true)
})

test('repository contract returns defensive copies', async () => {
  const repository = new InMemoryAssessmentSessionRepository()
  const created = await repository.createForOwner({
    ...sessionInput,
    id: 'session-copy',
    ownerId: 'copy_owner',
    status: 'consented',
    createdAt: '2026-07-16T14:00:00.000Z',
    updatedAt: '2026-07-16T14:00:00.000Z',
  })
  assert.equal(created.ok, true)
  if (!created.ok) return

  created.session.goal = 'mutated return value'
  const reread = await repository.findOwnedById('session-copy', 'copy_owner')
  assert.equal(reread?.goal, sessionInput.goal)
})

test('repository contract scopes export and hard deletion to the owner', async () => {
  const repository = new InMemoryAssessmentSessionRepository()
  const service = new AssessmentSessionService(repository, { idFactory: () => 'session-export' })
  const owner = { userId: 'export_owner', source: 'test-header' }
  const outsider = { userId: 'export_outsider', source: 'test-header' }
  const created = await service.createOwnedSession(owner, sessionInput)
  assert.equal(created.ok, true)
  if (!created.ok) return

  assert.equal(await service.exportOwnedSession(outsider, created.session.id), null)
  assert.equal(await service.deleteOwnedSession(outsider, created.session.id), false)
  assert.equal((await service.exportOwnedSession(owner, created.session.id))?.id, created.session.id)
  assert.equal(await service.deleteOwnedSession(owner, created.session.id), true)
  assert.equal(await service.getOwnedSession(owner, created.session.id), null)
})
