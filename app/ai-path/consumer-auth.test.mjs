import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import {
  AI_PATH_AUTH_DEFAULT_RETURN,
  consumerAuthBoundaryMode,
  isExactMutationOrigin,
  isMissingConsumerAuthSessionError,
  isValidConsumerEmail,
  normalizeAIPathReturnPath,
  resolveConsumerAuthRequestOrigin,
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
  assert.equal(consumerAuthBoundaryMode('development', 'true', { available: false }), 'preview')
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

test('development accepts the active loopback alias without weakening the production origin', () => {
  assert.equal(resolveConsumerAuthRequestOrigin(
    'http://localhost:3000/api/ai-path/auth/sign-in',
    'http://localhost:3000',
    'development',
    'http://127.0.0.1:3000',
  ), 'http://127.0.0.1:3000')
  assert.equal(resolveConsumerAuthRequestOrigin(
    'http://127.0.0.1:3001/api/ai-path/auth/sign-in',
    'http://localhost:3000',
    'development',
  ), 'http://localhost:3000')
  assert.equal(resolveConsumerAuthRequestOrigin(
    'http://[::1]:3000/api/ai-path/auth/sign-in',
    'http://localhost:3000',
    'development',
    'http://[::1]:3000',
  ), 'http://[::1]:3000')
  assert.equal(resolveConsumerAuthRequestOrigin(
    'https://alternate.example/api/ai-path/auth/sign-in',
    'https://learn.example.com',
    'production',
  ), 'https://learn.example.com')
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

test('missing Supabase auth session is unauthenticated, not service unavailable', () => {
  assert.equal(isMissingConsumerAuthSessionError({ name: 'AuthSessionMissingError', message: 'Auth session missing!' }), true)
  assert.equal(isMissingConsumerAuthSessionError({ message: 'No session found in request cookies.' }), true)
  assert.equal(isMissingConsumerAuthSessionError({ code: 'session_not_found' }), true)
  assert.equal(isMissingConsumerAuthSessionError({ name: 'AuthApiError', message: 'Project API key is invalid.' }), false)
})

test('route and proxy boundaries use verified identity and mutation-safe verbs', async () => {
  const proxySource = await readFile(new URL('../../proxy.ts', import.meta.url), 'utf8')
  const diagnosticRouteSource = await readFile(new URL('../api/ai-path/diagnostic/route.ts', import.meta.url), 'utf8')
  const signOutSource = await readFile(new URL('../api/ai-path/auth/sign-out/route.ts', import.meta.url), 'utf8')
  const signInSource = await readFile(new URL('../api/ai-path/auth/sign-in/route.ts', import.meta.url), 'utf8')
  const googleSource = await readFile(new URL('../api/ai-path/auth/google/route.ts', import.meta.url), 'utf8')
  const callbackSource = await readFile(new URL('./auth/callback/route.ts', import.meta.url), 'utf8')
  assert.match(proxySource, /auth\.getUser\(\)/)
  assert.doesNotMatch(proxySource, /auth\.getSession\(\)/)
  assert.match(proxySource, /matcher: \['\/ai-path\/:path\*', '\/api\/ai-path\/:path\*'\]/)
  assert.match(proxySource, /consumerAuthBoundaryMode\([\s\S]*process\.env\.NODE_ENV,[\s\S]*process\.env\.AI_PATH_CONSUMER_AUTH_ENABLED/)
  assert.match(proxySource, /invalidAuthConfigurationResponse\(request\)/)
  assert.match(proxySource, /isMissingConsumerAuthSessionError\(error\)/)
  assert.match(diagnosticRouteSource, /isMissingConsumerAuthSessionError\(error\)/)
  assert.match(signOutSource, /export async function POST/)
  assert.match(signOutSource, /isExactMutationOrigin/)
  assert.match(signInSource, /MAX_AUTH_FORM_BYTES = 8_192/)
  assert.match(signInSource, /application\/x-www-form-urlencoded/)
  assert.match(signInSource, /checkAiPathRateLimit\(request, 'ai-path-auth-sign-in'\)/)
  assert.match(signInSource, /'ai-path-auth-email'[\s\S]*email\.toLowerCase\(\)/)
  assert.match(googleSource, /isExactMutationOrigin/)
  assert.match(googleSource, /checkAiPathRateLimit\(request, 'ai-path-auth-sign-in'\)/)
  assert.match(googleSource, /provider: 'google'/)
  assert.match(googleSource, /skipBrowserRedirect: true/)
  assert.match(googleSource, /isTrustedSupabaseAuthorizationUrl/)
  assert.match(googleSource, /applyConsumerAuthResponse\(context, NextResponse\.redirect\(data\.url, 303\)\)/)
  assert.match(googleSource, /export async function GET\(request: Request\)[\s\S]*authPageRedirect/)
  assert.match(signInSource, /export async function GET\(request: Request\)[\s\S]*authPageRedirect/)
  assert.match(callbackSource, /checkAiPathRateLimit\(request, 'ai-path-auth-callback'\)/)
})

test('consumer pages distinguish configured auth from a verified signed-in user', async () => {
  const serverSource = await readFile(new URL('./lib/consumer-auth.server.ts', import.meta.url), 'utf8')
  const pageSource = await readFile(new URL('./page.tsx', import.meta.url), 'utf8')
  const accountSource = await readFile(new URL('./account/page.tsx', import.meta.url), 'utf8')
  assert.match(serverSource, /getVerifiedConsumerUser[\s\S]*auth\.getUser\(\)/)
  assert.doesNotMatch(serverSource, /getVerifiedConsumerUser[\s\S]*auth\.getSession\(\)/)
  assert.match(serverSource, /hasVerifiedConsumerSession[\s\S]*getVerifiedConsumerUser\(\)/)
  assert.match(pageSource, /authenticatedExperienceEnabled = authConfigured && await hasVerifiedConsumerSession\(\)/)
  assert.match(pageSource, /storagePersistenceAvailable = authenticatedExperienceEnabled/)
  assert.match(accountSource, /user = authConfigured \? await getVerifiedConsumerUser\(\) : null/)
  assert.match(accountSource, /isSignedIn = Boolean\(user\)/)
  assert.match(pageSource, /export const dynamic = 'force-dynamic'/)
  assert.match(accountSource, /export const dynamic = 'force-dynamic'/)
})
