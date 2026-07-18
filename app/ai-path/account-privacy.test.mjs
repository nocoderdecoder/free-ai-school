import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  AI_PATH_ACCOUNT_DELETE_CONFIRMATION,
  parseAccountDeleteConfirmation,
  resolveAccountPrivacyCapability,
} from './lib/account-privacy.ts'
import {
  handleAccountDeletePost,
  handleAccountExportPost,
} from './lib/account-privacy-http.ts'

function request(path, body) {
  return new Request(`https://ai.example${path}`, {
    method: 'POST',
    headers: {
      Origin: 'https://ai.example',
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

function runtime(overrides = {}) {
  const calls = []
  const service = {
    async exportOwnedAccount() {
      calls.push('export')
      return { assessments: [], consumerDiagnostics: [], learningPlans: [], realtimeAdmissions: [] }
    },
    async accountDeletionReadiness() {
      calls.push('ready')
      return { ready: true, retryAt: null }
    },
    async deleteAnalyticsForOwner(ownerId) {
      calls.push(`analytics:${ownerId}`)
    },
    async deleteAuthUser(ownerId) {
      calls.push(`auth:${ownerId}`)
    },
    ...overrides.service,
  }
  return {
    calls,
    value: {
      available: true,
      reason: 'test',
      principal: {
        id: '10000000-0000-4000-8000-000000000001',
        email: 'owner@example.com',
      },
      sessionBoundDeletionReauthentication: true,
      service,
      ...overrides.runtime,
    },
  }
}

test('account privacy capability cannot be opened by deployment configuration', () => {
  const capability = resolveAccountPrivacyCapability({
    enabled: 'true',
    schemaVersion: '2026-07-18.v1',
    credentialScope: 'server-only',
    ownershipProofReference: 'https://evidence.example/ownership',
    cascadeDeletionProofReference: 'https://evidence.example/deletion',
    analyticsDeletionReady: 'true',
    sessionBoundReauthenticationReady: 'true',
    rollbackReady: 'true',
  })
  assert.equal(capability.exportAvailable, false)
  assert.equal(capability.deletionAvailable, false)
  assert.match(capability.reason, /latches remain closed/)
})

test('account deletion requires exact confirmation and session-bound reauthentication', () => {
  assert.deepEqual(parseAccountDeleteConfirmation({ confirmation: AI_PATH_ACCOUNT_DELETE_CONFIRMATION }), { ok: true })
  assert.equal(parseAccountDeleteConfirmation({ confirmation: 'delete', extra: true }).ok, false)
})

test('account export is owner-scoped, no-store, and rejects cross-origin requests', async () => {
  const selected = runtime()
  const response = await handleAccountExportPost(request('/api/ai-path/account/export'), selected.value)
  assert.equal(response.status, 200)
  assert.match(response.headers.get('content-disposition') || '', /attachment/)
  assert.match(response.headers.get('cache-control') || '', /no-store/)
  const payload = await response.json()
  assert.equal(payload.account.email, 'owner@example.com')
  assert.deepEqual(selected.calls, ['export'])

  const crossOrigin = new Request('https://ai.example/api/ai-path/account/export', {
    method: 'POST',
    headers: { Origin: 'https://evil.example' },
  })
  assert.equal((await handleAccountExportPost(crossOrigin, selected.value)).status, 403)

  const anonymous = runtime({ runtime: { principal: null, service: null } })
  assert.equal((await handleAccountExportPost(request('/api/ai-path/account/export'), anonymous.value)).status, 401)
})

test('account deletion fails closed and erases analytics before auth user', async () => {
  const selected = runtime()
  const response = await handleAccountDeletePost(request('/api/ai-path/account/delete', {
    confirmation: AI_PATH_ACCOUNT_DELETE_CONFIRMATION,
  }), selected.value)
  assert.equal(response.status, 204)
  assert.equal(response.headers.get('clear-site-data'), '"cache", "cookies", "storage"')
  assert.deepEqual(selected.calls, [
    'ready',
    'analytics:10000000-0000-4000-8000-000000000001',
    'auth:10000000-0000-4000-8000-000000000001',
  ])

  const stale = runtime({
    runtime: {
      sessionBoundDeletionReauthentication: false,
    },
  })
  const staleResponse = await handleAccountDeletePost(request('/api/ai-path/account/delete', {
    confirmation: AI_PATH_ACCOUNT_DELETE_CONFIRMATION,
  }), stale.value)
  assert.equal(staleResponse.status, 401)
  assert.deepEqual(stale.calls, [])

  const active = runtime({
    service: {
      async accountDeletionReadiness() {
        active.calls.push('ready')
        return { ready: false, retryAt: '2026-07-18T20:02:00.000Z' }
      },
    },
  })
  const activeResponse = await handleAccountDeletePost(request('/api/ai-path/account/delete', {
    confirmation: AI_PATH_ACCOUNT_DELETE_CONFIRMATION,
  }), active.value)
  assert.equal(activeResponse.status, 409)
  assert.deepEqual(active.calls, ['ready'])
})

test('account privacy SQL is owner-derived, full-scope, and does not delete auth users', () => {
  const sql = readFileSync(new URL('../../supabase/migrations/20260718020000_ai_path_account_privacy.sql', import.meta.url), 'utf8')
  assert.match(sql, /create or replace function public\.export_owned_ai_path_account\(\)/i)
  assert.match(sql, /where session_row\.owner_id = auth\.uid\(\)/i)
  assert.match(sql, /where plan_row\.owner_id = auth\.uid\(\)/i)
  assert.match(sql, /realtimeAdmissions/i)
  assert.match(sql, /consumerDiagnostics/i)
  assert.match(sql, /grant execute[\s\S]*to authenticated/i)
  assert.doesNotMatch(sql, /delete\s+from\s+auth\.users/i)
  assert.doesNotMatch(sql, /p_owner_id/i)
})

test('server runtime checks literal latches before reading deletion credentials', () => {
  const capabilitySource = readFileSync(new URL('./lib/account-privacy.ts', import.meta.url), 'utf8')
  const runtimeSource = readFileSync(new URL('./lib/account-privacy.server.ts', import.meta.url), 'utf8')
  const deleteRouteSource = readFileSync(new URL('../api/ai-path/account/delete/route.ts', import.meta.url), 'utf8')
  assert.match(capabilitySource, /AI_PATH_ACCOUNT_EXPORT_RUNTIME_LATCH = false as const/)
  assert.match(capabilitySource, /AI_PATH_ACCOUNT_DELETION_RUNTIME_LATCH = false as const/)
  assert.ok(runtimeSource.indexOf('activationCapability()') < runtimeSource.indexOf('process.env.SUPABASE_SERVICE_ROLE_KEY'))
  assert.match(runtimeSource, /Production analytics deletion is not assembled/)
  assert.match(runtimeSource, /sessionBoundDeletionReauthentication: false/)
  assert.match(deleteRouteSource, /response\.status === 204 \? response : selection\.applyResponse\(response\)/)
})
