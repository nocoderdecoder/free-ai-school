import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const runtimeSourceUrl = new URL('./lib/realtime-bootstrap-runtime.server.ts', import.meta.url)
const publicRouteUrl = new URL('../api/ai-path/realtime/session/route.ts', import.meta.url)

test('request-scoped Realtime assembly remains independently latched and provider-free', async () => {
  const source = await readFile(runtimeSourceUrl, 'utf8')
  assert.match(source, /export const AI_PATH_REALTIME_REQUEST_ASSEMBLY_LATCH = false as const/)
  assert.doesNotMatch(source, /api\.openai\.com|OPENAI_API_KEY|OpenAI-Safety-Identifier|createLiveRealtimeCall|\bfetch\s*\(/)
  assert.match(source, /import 'server-only'/)
})

test('all latches and evidence checks precede authentication, credential access, and client construction', async () => {
  const source = await readFile(runtimeSourceUrl, 'utf8')
  const latchCheck = source.indexOf('!AI_PATH_REALTIME_REQUEST_ASSEMBLY_LATCH', source.indexOf('createRealtimeBootstrapRequestRuntime'))
  const capabilityCheck = source.indexOf('getSupabasePersistenceCapability()')
  const evidenceCheck = source.indexOf("activation.enabled !== 'true'")
  const authentication = source.indexOf('createVerifiedSupabaseContext(request)')
  const credentialRead = source.indexOf('process.env.SUPABASE_SERVICE_ROLE_KEY')
  const privilegedClient = source.indexOf('createClient<Database>')
  assert.ok(latchCheck >= 0)
  assert.ok(capabilityCheck > latchCheck)
  assert.ok(evidenceCheck > capabilityCheck)
  assert.ok(authentication > evidenceCheck)
  assert.ok(credentialRead > authentication)
  assert.ok(privilegedClient > credentialRead)
  assert.match(source, /!AI_PATH_REALTIME_AUTHENTICATED_BOOTSTRAP_LATCH/)
  assert.match(source, /!AI_PATH_REALTIME_ADMISSION_PRODUCTION_LATCH/)
  assert.match(source, /!AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH/)
  assert.match(source, /!AI_PATH_SUPABASE_REALTIME_ADMISSION_GATEWAY_LATCH/)
  assert.match(source, /activation\.policyVersion !== AI_PATH_REALTIME_ADMISSION_POLICY\.version/)
  assert.match(source, /activation\.policyId !== AI_PATH_REALTIME_ADMISSION_POLICY\.policyId/)
})

test('one authenticated request client is reused for ownership and intent while service role is narrow and non-persistent', async () => {
  const source = await readFile(runtimeSourceUrl, 'utf8')
  assert.match(source, /createSupabaseAssessmentSessionRepository\(context\.client, capability\)/)
  assert.match(source, /authenticatedClient: context\.client/)
  assert.match(source, /serviceRoleClient/)
  assert.match(source, /autoRefreshToken: false/)
  assert.match(source, /detectSessionInUrl: false/)
  assert.match(source, /persistSession: false/)
  assert.match(source, /isSafeSupabasePublicKey\(serviceRoleKey\)/)
  assert.doesNotMatch(source, /console\.|logger\.|Authorization|cookie\s*:/i)
})

test('public route does not import or assemble the dormant request runtime', async () => {
  const source = await readFile(publicRouteUrl, 'utf8')
  assert.doesNotMatch(source, /realtime-bootstrap-runtime|createRealtimeBootstrapRequestRuntime|realtime-provider-lifecycle/)
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|createClient|createVerifiedSupabaseContext/)
})
