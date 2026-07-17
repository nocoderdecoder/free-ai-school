import assert from 'node:assert/strict'
import test from 'node:test'

import { readBoundedJson } from './lib/request-body.ts'

test('bounded JSON reader accepts valid small bodies', async () => {
  const result = await readBoundedJson(new Request('https://example.test', {
    method: 'POST',
    body: JSON.stringify({ okay: true }),
  }), 100)
  assert.deepEqual(result, { ok: true, value: { okay: true } })
})

test('bounded JSON reader rejects declared and streamed oversized bodies', async () => {
  const declared = await readBoundedJson(new Request('https://example.test', {
    method: 'POST',
    headers: { 'Content-Length': '101' },
    body: '{}',
  }), 100)
  assert.deepEqual(declared, { ok: false, error: 'request_too_large', status: 413 })

  const streamed = await readBoundedJson(new Request('https://example.test', {
    method: 'POST',
    body: JSON.stringify({ value: 'x'.repeat(120) }),
  }), 100)
  assert.deepEqual(streamed, { ok: false, error: 'request_too_large', status: 413 })
})

test('bounded JSON reader rejects malformed JSON', async () => {
  const result = await readBoundedJson(new Request('https://example.test', {
    method: 'POST',
    body: '{not-json}',
  }), 100)
  assert.deepEqual(result, { ok: false, error: 'invalid_json', status: 400 })
})
