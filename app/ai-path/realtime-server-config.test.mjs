import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const sourceUrl = new URL('./lib/realtime.server.ts', import.meta.url)

test('live Realtime requires an explicitly reviewed input transcription model', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  assert.match(source, /SUPPORTED_INPUT_TRANSCRIPTION_MODELS = new Set\(\['gpt-4o-transcribe'\]\)/)
  assert.match(source, /capability\.liveEnabled && !SUPPORTED_INPUT_TRANSCRIPTION_MODELS\.has\(process\.env\.AI_PATH_REALTIME_TRANSCRIPTION_MODEL/)
  assert.match(source, /transcription: \{ model: transcriptionModel \}/)
  assert.doesNotMatch(source, /AI_PATH_REALTIME_TRANSCRIPTION_MODEL\s*\|\|/)
})

test('provider transport remains dominated by the public literal latch', async () => {
  const source = await readFile(sourceUrl, 'utf8')
  const functionStart = source.indexOf('export async function createLiveRealtimeCall')
  const latch = source.indexOf('!AI_PATH_PUBLIC_REALTIME_BOOTSTRAP_READY', functionStart)
  const capability = source.indexOf('getRealtimeCapability()', functionStart)
  const providerCall = source.indexOf('fetch(OPENAI_REALTIME_URL', functionStart)
  assert.ok(functionStart >= 0)
  assert.ok(latch > functionStart)
  assert.ok(capability > latch)
  assert.ok(providerCall > capability)
})
