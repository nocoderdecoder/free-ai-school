import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_AUTH_DEFAULT_RETURN,
  consumerAuthBoundaryMode,
  isExactMutationOrigin,
  isValidConsumerEmail,
  normalizeAIPathReturnPath,
  resolveConsumerAuthCapability,
} from './lib/consumer-auth.ts'

const safeEnvironment = {
  nodeEnv: 'production',
  enabled: 'true',
  publicOrigin: 'https://learn.example.com',
  supabaseUrl: 'https://abcdefghijklmnopqrst.supabase.co',
  publishableKey: 'sb_publishable_browser_safe',
}

test('consumer auth is fail-closed until every production control is configured', () => {
  assert.equal(resolveConsumerAuthCapability({}).available, false)
  assert.equal(resolveConsumerAuthCapability({ ...safeEnvironment, enabled: 'false' }).available, false)
  assert.equal(resolveConsumerAuthCapability({ ...safeEnvironment, publicOrigin: undefined }).available, false)
  assert.equal(resolveConsumerAuthCapability({ ...safeEnvironment, publicOrigin: 'http://learn.example.com' }).available, false)
  assert.equal(resolveConsumerAuthCapability({ ...safeEnvironment, supabaseUrl: 'https://attacker.example' }).available, false)
  assert.equal(resolveConsumerAuthCapability({ ...safeEnvironment, publishableKey: 'sb_secret_server_key' }).available, false)
  assert.equal(resolveConsumerAuthCapability({
    ...safeEnvironment,
    serviceRoleKey: safeEnvironment.publishableKey,
  }).available, false)
  assert.deepEqual(resolveConsumerAuthCapability(safeEnvironment), {
    available: true,
    reason: 'consumer authentication is configured',
    publicOrigin: 'https://learn.example.com',
  })
})

test('proxy boundary permits intentional preview but fails shut on broken activation', () => {
  assert.equal(consumerAuthBoundaryMode('development', undefined, { available: false }), 'preview')
  assert.equal(consumerAuthBoundaryMode('test', 'false', { available: false }), 'preview')
  assert.equal(consumerAuthBoundaryMode('production', undefined, { available: false }), 'unavailable')
  assert.equal(consumerAuthBoundaryMode('production', 'TRUE', { available: false }), 'unavailable')
  assert.equal(consumerAuthBoundaryMode('production', 'false', { available: false }), 'unavailable')
  assert.equal(consumerAuthBoundaryMode('production', 'true', { available: true }), 'protect')
})

test('development permits only loopback HTTP origins', () => {
  assert.equal(resolveConsumerAuthCapability({
    ...safeEnvironment,
    nodeEnv: 'development',
    publicOrigin: 'http://localhost:3022',
  }).available, true)
  assert.equal(resolveConsumerAuthCapability({
    ...safeEnvironment,
    nodeEnv: 'development',
    publicOrigin: 'http://public.example.com',
  }).available, false)
})

test('return paths stay inside AI Path and cannot loop through the callback', () => {
  assert.equal(normalizeAIPathReturnPath('/ai-path?step=2'), '/ai-path?step=2')
  assert.equal(normalizeAIPathReturnPath('/ai-path/plan/abc'), '/ai-path/plan/abc')
  assert.equal(normalizeAIPathReturnPath('https://attacker.example'), AI_PATH_AUTH_DEFAULT_RETURN)
  assert.equal(normalizeAIPathReturnPath('//attacker.example/ai-path'), AI_PATH_AUTH_DEFAULT_RETURN)
  assert.equal(normalizeAIPathReturnPath('/admin'), AI_PATH_AUTH_DEFAULT_RETURN)
  assert.equal(normalizeAIPathReturnPath('/ai-path/auth/callback?code=stolen'), AI_PATH_AUTH_DEFAULT_RETURN)
  assert.equal(normalizeAIPathReturnPath('/ai-path/%5c%5cattacker.example'), AI_PATH_AUTH_DEFAULT_RETURN)
  assert.equal(normalizeAIPathReturnPath('/ai-path/%0d%0aLocation:%20https://attacker.example'), AI_PATH_AUTH_DEFAULT_RETURN)
})

test('email and mutation-origin validation reject ambiguous inputs', () => {
  assert.equal(isValidConsumerEmail('person@example.com'), true)
  assert.equal(isValidConsumerEmail('not-an-email'), false)
  assert.equal(isValidConsumerEmail(`x@${'a'.repeat(250)}.com`), false)

  const sameOrigin = new Request('https://learn.example.com/api/ai-path/auth/sign-out', {
    method: 'POST',
    headers: { origin: 'https://learn.example.com' },
  })
  assert.equal(isExactMutationOrigin(sameOrigin, 'https://learn.example.com'), true)
  assert.equal(isExactMutationOrigin(new Request(sameOrigin.url, { method: 'POST' }), 'https://learn.example.com'), false)
  assert.equal(isExactMutationOrigin(new Request(sameOrigin.url, {
    method: 'POST',
    headers: { origin: 'https://attacker.example' },
  }), 'https://learn.example.com'), false)
})

test('route and proxy boundaries use verified identity and mutation-safe verbs', async () => {
  const proxySource = await readFile(new URL('../../proxy.ts', import.meta.url), 'utf8')
  const signOutSource = await readFile(new URL('../api/ai-path/auth/sign-out/route.ts', import.meta.url), 'utf8')
  const signInSource = await readFile(new URL('../api/ai-path/auth/sign-in/route.ts', import.meta.url), 'utf8')
  const callbackSource = await readFile(new URL('./auth/callback/route.ts', import.meta.url), 'utf8')
  assert.match(proxySource, /auth\.getUser\(\)/)
  assert.doesNotMatch(proxySource, /auth\.getSession\(\)/)
  assert.match(proxySource, /matcher: \['\/ai-path\/:path\*', '\/api\/ai-path\/:path\*'\]/)
  assert.match(proxySource, /consumerAuthBoundaryMode\([\s\S]*process\.env\.NODE_ENV,[\s\S]*process\.env\.AI_PATH_CONSUMER_AUTH_ENABLED/)
  assert.match(proxySource, /invalidAuthConfigurationResponse\(request\)/)
  assert.match(signOutSource, /export async function POST/)
  assert.match(signOutSource, /isExactMutationOrigin/)
  assert.match(signInSource, /MAX_AUTH_FORM_BYTES = 8_192/)
  assert.match(signInSource, /application\/x-www-form-urlencoded/)
  assert.match(signInSource, /checkAiPathRateLimit\(request, 'ai-path-auth-sign-in'\)/)
  assert.match(signInSource, /'ai-path-auth-email'[\s\S]*email\.toLowerCase\(\)/)
  assert.match(callbackSource, /checkAiPathRateLimit\(request, 'ai-path-auth-callback'\)/)
})
