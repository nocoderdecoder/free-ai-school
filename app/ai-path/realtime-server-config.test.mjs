import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sourceUrl = new URL('./lib/realtime.server.ts', import.meta.url)

test('live Realtime requires an explicitly reviewed input transcription model', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /SUPPORTED_INPUT_TRANSCRIPTION_MODELS = new Set\(\['gpt-4o-transcribe'\]\)/)
  assert.match(source, /const transcriptionModel = process\.env\.AI_PATH_REALTIME_TRANSCRIPTION_MODEL/)
  assert.match(source, /capability\.liveEnabled && !SUPPORTED_INPUT_TRANSCRIPTION_MODELS\.has\(transcriptionModel\)/)
  assert.match(source, /transcription: \{ model: transcriptionModel \}/)
  assert.match(source, /process\.env\.NODE_ENV === 'production' \? '' : 'gpt-4o-transcribe'/)
  assert.match(source, /process\.env\.AI_PATH_ALLOW_PAID_API_CALLS === 'true' \|\| process\.env\.ALLOW_PAID_API_CALLS === 'true'/)
})

test('provider transport mints ephemeral client secrets instead of exposing the durable key to the browser', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  const functionStart = source.indexOf('export async function createRealtimeClientSecret')
  const endpoint = source.indexOf('/v1/realtime/client_secrets')
  const capability = source.indexOf('getRealtimeCapability()', functionStart)
  const safetyHeader = source.indexOf('OpenAI-Safety-Identifier', functionStart)
  const providerCall = source.indexOf('fetch(OPENAI_REALTIME_CLIENT_SECRETS_URL', functionStart)
  assert.ok(functionStart >= 0)
  assert.ok(endpoint > 0)
  assert.ok(capability > functionStart)
  assert.ok(safetyHeader > capability)
  assert.ok(providerCall > capability)
  assert.doesNotMatch(source, /new Response\(live\.answerSdp/)
  assert.doesNotMatch(source, /FormData\(\)/)
})
