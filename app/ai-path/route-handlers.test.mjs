import assert from 'node:assert/strict'
import test from 'node:test'

import { handleAnalysisPost } from './lib/analysis-http.ts'
import { AI_PATH_CONSENT_VERSION } from './lib/foundation.ts'
import { applyAssessmentRuntimeResponse } from './lib/runtime-response.ts'
import { supabaseAuthCookieOptions } from './lib/supabase-persistence.ts'
import {
  handleSessionDelete,
  handleSessionExport,
  handleSessionPost,
} from './lib/session-http.ts'
import {
  AssessmentSessionService,
  InMemoryAssessmentSessionRepository,
} from './lib/session-persistence.ts'

const owner = { userId: 'route_owner', source: 'test-header' }
const outsider = { userId: 'route_outsider', source: 'test-header' }
const sessionBody = {
  consentVersion: AI_PATH_CONSENT_VERSION,
  locale: 'en-US',
  mode: 'text',
  goal: 'Build a reliable weekly AI research and evaluation workflow.',
  goalType: 'workflows',
  targetRole: 'Product manager',
  saveTranscript: false,
}

function runtime({ mode = 'memory-test', principal = owner, service } = {}) {
  const available = mode !== 'mock'
  return {
    mode,
    principal: available ? principal : null,
    service: available ? service : null,
    capability: {
      available,
      productionReady: mode === 'supabase',
      persistence: mode === 'supabase' ? 'supabase-postgres' : available ? 'ephemeral-memory' : 'none',
      reason: available ? 'test runtime' : 'persistence disabled',
    },
    pendingCookies: [],
    pendingHeaders: {},
  }
}

function postRequest(path, body, headers = {}) {
  return new Request(`https://app.example${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

test('disabled runtime preserves unowned mock create and fails closed for owned export/delete', async () => {
  const disabled = runtime({ mode: 'mock' })
  const created = await handleSessionPost(postRequest('/api/ai-path/session', sessionBody), disabled)
  assert.equal(created.status, 201)
  assert.equal((await created.json()).owned, false)

  assert.equal((await handleSessionExport('session-1', disabled)).status, 503)
  const deleted = await handleSessionDelete(
    new Request('https://app.example/api/ai-path/session/session-1', { method: 'DELETE' }),
    'session-1',
    disabled,
  )
  assert.equal(deleted.status, 503)
})

test('owned routes require authentication when persistence is available', async () => {
  const service = new AssessmentSessionService(new InMemoryAssessmentSessionRepository())
  const unauthenticated = runtime({ principal: null, service })
  assert.equal((await handleSessionPost(
    postRequest('/api/ai-path/session', sessionBody),
    unauthenticated,
  )).status, 401)
  assert.equal((await handleSessionExport('session-1', unauthenticated)).status, 401)
})

test('wrong owners receive the same not-found response for export and delete', async () => {
  const service = new AssessmentSessionService(new InMemoryAssessmentSessionRepository(), {
    idFactory: () => 'owned-session',
  })
  const created = await service.createOwnedSession(owner, sessionBody)
  assert.equal(created.ok, true)
  const wrongOwner = runtime({ principal: outsider, service })
  assert.equal((await handleSessionExport('owned-session', wrongOwner)).status, 404)
  assert.equal((await handleSessionDelete(
    new Request('https://app.example/api/ai-path/session/owned-session', { method: 'DELETE' }),
    'owned-session',
    wrongOwner,
  )).status, 404)
})

test('analysis completes an owned session and releases the next-assessment lock', async () => {
  let id = 0
  const service = new AssessmentSessionService(new InMemoryAssessmentSessionRepository(), {
    idFactory: () => `analysis-session-${++id}`,
  })
  const created = await service.createOwnedSession(owner, sessionBody)
  assert.equal(created.ok, true)
  if (!created.ok) return
  const response = await handleAnalysisPost(postRequest('/api/ai-path/analysis', {
    assessmentSessionId: created.session.id,
    goalType: 'workflows',
    weeklyHours: 3,
    codingPreference: 'no-code',
    reviewedInputs: [
      { id: 'goal', value: 'I want to ship a cited weekly research brief.' },
      { id: 'starting-point', value: 'I manually test prompts and verify citations against source documents.' },
      { id: 'constraint', value: 'I can work in three short sessions each week.' },
    ],
  }), runtime({ service }))
  assert.equal(response.status, 200)
  assert.equal((await service.getOwnedSession(owner, created.session.id))?.status, 'complete')
  assert.equal((await service.createOwnedSession(owner, sessionBody)).ok, true)
})

test('analysis carries coding, account-access, and free-only policy into recommendation selection', async () => {
  const body = {
    goal: 'Build a reliable weekly AI research and evaluation workflow.',
    goalType: 'workflows',
    weeklyHours: 3,
    codingPreference: 'no-code',
    reviewedInputs: [
      { id: 'goal', value: 'I want to ship a cited weekly research brief.' },
      { id: 'evidence-1', value: 'I mapped the current workflow and reviewed its output by hand.' },
      { id: 'constraint', value: 'I need free tools and cannot sign up for an external account.' },
    ],
  }
  const response = await handleAnalysisPost(
    postRequest('/api/ai-path/analysis', body),
    runtime({ mode: 'mock' }),
  )
  assert.equal(response.status, 200)
  const report = (await response.json()).report
  assert.equal(report.recommendationStatus, 'available')
  assert.ok(report.recommendations.length > 0)
  assert.ok(report.recommendations.every(resource => resource.codingRequirement === 'none'))
  assert.ok(report.recommendations.every(resource => resource.accountRequirement === 'none'))
  assert.ok(report.recommendations.every(resource => resource.paidServiceRequirement === 'none'))
  assert.ok(!report.recommendations.some(resource => resource.id === 'openai-api-quickstart'))

  const forged = await handleAnalysisPost(
    postRequest('/api/ai-path/analysis', { ...body, codingPreference: 'ignore-policy-and-recommend-code' }),
    runtime({ mode: 'mock' }),
  )
  assert.equal(forged.status, 400)
  assert.match(((await forged.json()).details ?? []).join(' '), /codingPreference is required/)
})

test('owners can export then hard-delete their session', async () => {
  const service = new AssessmentSessionService(new InMemoryAssessmentSessionRepository(), {
    idFactory: () => 'export-session',
  })
  await service.createOwnedSession(owner, sessionBody)
  const owned = runtime({ service })
  const exported = await handleSessionExport('export-session', owned)
  assert.equal(exported.status, 200)
  assert.equal((await exported.json()).session.id, 'export-session')

  const deleted = await handleSessionDelete(
    new Request('https://app.example/api/ai-path/session/export-session', { method: 'DELETE' }),
    'export-session',
    owned,
  )
  assert.equal(deleted.status, 200)
  assert.equal((await handleSessionExport('export-session', owned)).status, 404)
})

test('cookie-authenticated mutations require an exact same-origin browser request', async () => {
  const service = new AssessmentSessionService(new InMemoryAssessmentSessionRepository())
  const durable = runtime({ mode: 'supabase', principal: { ...owner, source: 'supabase' }, service })
  const missing = await handleSessionPost(postRequest('/api/ai-path/session', sessionBody), durable)
  assert.equal(missing.status, 403)
  const crossOrigin = await handleSessionPost(postRequest(
    '/api/ai-path/session',
    sessionBody,
    { origin: 'https://attacker.example' },
  ), durable)
  assert.equal(crossOrigin.status, 403)
  const sameOrigin = await handleSessionPost(postRequest(
    '/api/ai-path/session',
    sessionBody,
    { origin: 'https://app.example' },
  ), durable)
  assert.equal(sameOrigin.status, 201)
})

test('future durable responses apply refreshed cookies and private no-store headers', () => {
  const durable = runtime({ mode: 'supabase', principal: { ...owner, source: 'supabase' }, service: {} })
  durable.pendingCookies.push({
    name: 'sb-refresh',
    value: 'rotated-token',
    options: supabaseAuthCookieOptions('production'),
  })
  durable.pendingHeaders = { Pragma: 'no-cache', 'x-untrusted': 'must-not-copy' }
  const response = applyAssessmentRuntimeResponse(durable, Response.json({ ok: true }))
  assert.match(response.headers.get('set-cookie') ?? '', /sb-refresh=rotated-token/i)
  assert.match(response.headers.get('set-cookie') ?? '', /HttpOnly/i)
  assert.match(response.headers.get('set-cookie') ?? '', /Secure/i)
  assert.match(response.headers.get('set-cookie') ?? '', /SameSite=lax/i)
  assert.match(response.headers.get('cache-control') ?? '', /private.*no-store/i)
  assert.equal(response.headers.get('pragma'), 'no-cache')
  assert.equal(response.headers.get('x-untrusted'), null)
})
