import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { handleDiagnosticPost } from './lib/diagnostic-http.ts'
import { parseDiagnosticIntake } from './lib/diagnostic-input.ts'
import {
  AI_PATH_DIAGNOSTIC_VERSION,
  INITIAL_CAPABILITY_INTAKE,
  INITIAL_USE_CASE_INTAKE,
} from './lib/diagnostic.ts'

const origin = 'https://advisor.example'

function useCase(overrides = {}) {
  return {
    ...structuredClone(INITIAL_USE_CASE_INTAKE),
    outcome: { desiredOutcome: 'Help our sales team prepare accurate account briefs before customer calls.' },
    workflow: { currentProcess: 'A manager searches several systems and manually creates each brief, which is slow and inconsistent.' },
    specification: {
      inputs: 'Approved CRM fields and public account notes', output: 'A reviewable one-page account brief',
      success: 'At least 9 of 10 facts are supported by an approved source.',
    },
    experience: { level: 'guided', evidence: '', artifactUrl: '' },
    risk: { dataSensitivity: 'internal', existingSystems: 'CRM export', consequence: 'moderate', humanApproval: 'yes' },
    constraints: { role: 'Sales manager', codingComfort: 'modify-examples', weeklyHours: 3, approach: 'either', teamMode: 'team', budget: 'free-only' },
    ...overrides,
  }
}

function capability() {
  return {
    ...structuredClone(INITIAL_CAPABILITY_INTAKE),
    direction: { roleContext: 'Operations manager', interests: ['automate-repeated-work', 'improve-reliability'] },
    experience: { levels: { 'ai-assisted-work': 'adapted', automation: 'guided', applications: 'none', 'data-retrieval': 'none', 'evaluation-safety': 'guided' } },
    evidence: { description: 'I adapted an AI drafting workflow for weekly operating updates and checked it against the source spreadsheet.', supportedDomains: ['ai-assisted-work'], artifactUrl: '' },
    reasoning: { scenarioId: 'workflow-review', response: 'I would test expected and difficult examples, compare errors, and require a person to approve uncertain results.' },
    foundations: { codingComfort: 'modify-examples', dataComfort: 'spreadsheets', tools: ['ChatGPT', 'Google Sheets'] },
    constraints: { weeklyHours: 4, learningPreference: 'projects', pace: '30-day', resourceBudget: 'free-only', publicProject: 'no' },
  }
}

function request(body, headers = {}) {
  return new Request(`${origin}/api/ai-path/diagnostic`, { method: 'POST', headers: { origin, 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })
}

test('strict parser accepts both current diagnostic paths', () => {
  assert.equal(parseDiagnosticIntake(useCase()).ok, true)
  assert.equal(parseDiagnosticIntake(capability()).ok, true)
})

test('strict parser rejects extra fields, unsafe artifact URLs, and future versions', () => {
  assert.equal(parseDiagnosticIntake({ ...useCase(), unexpected: true }).ok, false)
  assert.equal(parseDiagnosticIntake(useCase({ experience: { level: 'guided', evidence: '', artifactUrl: 'javascript:alert(1)' } })).ok, false)
  assert.equal(parseDiagnosticIntake({ ...useCase(), version: `${AI_PATH_DIAGNOSTIC_VERSION}-future` }).ok, false)
})

test('server-owned diagnostic returns deterministic plans for validated input', async () => {
  const useCaseResponse = await handleDiagnosticPost(request(useCase()))
  assert.equal(useCaseResponse.status, 200)
  const useCaseBody = await useCaseResponse.json()
  assert.equal(useCaseBody.generatedBy, 'deterministic-server-policy')
  assert.equal(useCaseBody.persisted, false)
  assert.equal(useCaseBody.result.kind, 'use-case-blueprint')
  const capabilityResponse = await handleDiagnosticPost(request(capability()))
  assert.equal(capabilityResponse.status, 200)
  assert.equal((await capabilityResponse.json()).result.kind, 'capability-prescription')
})

test('diagnostic endpoint rejects cross-origin, missing-origin and non-JSON requests', async () => {
  const crossOrigin = await handleDiagnosticPost(request(useCase(), { origin: 'https://attacker.example' }))
  assert.equal(crossOrigin.status, 403)
  assert.equal((await crossOrigin.json()).error, 'cross_origin_request_rejected')
  const missingOrigin = await handleDiagnosticPost(new Request(`${origin}/api/ai-path/diagnostic`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(useCase()) }))
  assert.equal(missingOrigin.status, 403)
  const wrongType = await handleDiagnosticPost(new Request(`${origin}/api/ai-path/diagnostic`, { method: 'POST', headers: { origin, 'content-type': 'text/plain' }, body: JSON.stringify(useCase()) }))
  assert.equal(wrongType.status, 415)
})

test('development same-origin check accepts a browser host preserved by the Next proxy', async () => {
  const proxied = new Request('http://localhost:3000/api/ai-path/diagnostic', {
    method: 'POST',
    headers: {
      origin: 'http://127.0.0.1:3022',
      host: 'localhost:3000',
      'x-forwarded-host': '127.0.0.1:3022',
      'x-forwarded-proto': 'http',
      'content-type': 'application/json',
    },
    body: JSON.stringify(useCase()),
  })
  const response = await handleDiagnosticPost(proxied)
  assert.equal(response.status, 200)
})

test('public route performs cheap checks, verified auth and layered limiting in order', async () => {
  const source = await readFile(new URL('../api/ai-path/diagnostic/route.ts', import.meta.url), 'utf8')
  const preflight = source.indexOf('diagnosticPreflightResponse(request)')
  const verifiedIdentity = source.indexOf('auth.getUser()')
  const limiter = source.indexOf("checkAiPathRateLimit(request, 'ai-path-diagnostic', verifiedUserId)")
  const bodyHandler = source.indexOf('await handleDiagnosticPost(request, {')
  assert.ok(preflight >= 0 && verifiedIdentity > preflight && limiter > verifiedIdentity && bodyHandler > limiter)
  assert.doesNotMatch(source, /auth\.getSession\(\)/)
})
