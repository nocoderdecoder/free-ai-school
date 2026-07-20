import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AI_PATH_REALTIME_CLIENT_PROVIDER_LATCH,
  createRealtimeVoiceController,
} from './realtime-controller.ts'
import { createBrowserRealtimeDependencies } from './realtime-browser-dependencies.ts'
import {
  buildReviewedInputsFromVoiceTranscript,
  MAX_REVIEWED_INPUT_CHARACTERS,
  MAX_VOICE_EVIDENCE_INPUTS,
} from './realtime-reviewed-inputs.ts'
import {
  AI_PATH_VOICE_CONSENT_VERSION,
  createVoiceConsent,
  isCurrentVoiceConsent,
} from './realtime-consent.ts'
import {
  INITIAL_REALTIME_VOICE_STATE,
  reduceRealtimeVoiceState,
} from './realtime-session-state.ts'
import {
  applyTranscriptUpdate,
  normalizeRealtimeTranscriptEvent,
} from './realtime-transcript.ts'
import { parseReviewedAssessment } from '../lib/reviewed-assessment.ts'

class MockEventTarget {
  listeners = new Map()
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? new Set()
    listeners.add(listener)
    this.listeners.set(type, listeners)
  }
  removeEventListener(type, listener) { this.listeners.get(type)?.delete(listener) }
  emit(type, event = {}) { for (const listener of this.listeners.get(type) ?? []) listener(event) }
}

class MockTrack extends MockEventTarget {
  stopCalls = 0
  stop() { this.stopCalls += 1 }
}

class MockChannel extends MockEventTarget {
  readyState = 'connecting'
  sent = []
  closeCalls = 0
  send(value) { this.sent.push(value) }
  close() { this.closeCalls += 1; this.readyState = 'closed' }
  open() { this.readyState = 'open'; this.emit('open') }
}

class MockPeer extends MockEventTarget {
  connectionState = 'new'
  channel = new MockChannel()
  tracks = []
  localDescription = null
  remoteDescription = null
  closeCalls = 0
  addTrack(track, stream) { this.tracks.push({ track, stream }) }
  createDataChannel(label) { this.label = label; return this.channel }
  async createOffer() { return { type: 'offer', sdp: 'v=0\r\nmock-offer' } }
  async setLocalDescription(value) { this.localDescription = value }
  async setRemoteDescription(value) { this.remoteDescription = value }
  close() { this.closeCalls += 1; this.connectionState = 'closed' }
}

function consent() {
  return createVoiceConsent({
    audioStreamingAccepted: true,
    transcriptReviewAccepted: true,
    now: () => new Date('2026-07-17T12:00:00.000Z'),
  })
}

function harness(overrides = {}) {
  const calls = []
  const track = new MockTrack()
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] }
  const peers = []
  const dependencies = {
    networkAccess: 'none',
    async getUserMedia(value) { calls.push(['media', value]); return stream },
    createPeerConnection() { const peer = new MockPeer(); peers.push(peer); calls.push(['peer']); return peer },
    async exchangeSdp(value) { calls.push(['sdp', value]); return 'v=0\r\nmock-answer' },
    async attachRemoteAudio(value) { calls.push(['audio', value]) },
    ...overrides,
  }
  return { calls, track, stream, peers, dependencies }
}

test('voice consent is explicit, versioned, and separate from text consent', () => {
  assert.equal(createVoiceConsent({ audioStreamingAccepted: true, transcriptReviewAccepted: false }), null)
  const accepted = consent()
  assert.equal(accepted.version, AI_PATH_VOICE_CONSENT_VERSION)
  assert.equal(isCurrentVoiceConsent(accepted), true)
  assert.equal(isCurrentVoiceConsent({ ...accepted, version: 'old' }), false)
})

test('provider-marked dependencies are allowed after explicit Realtime approval', async () => {
  assert.equal(AI_PATH_REALTIME_CLIENT_PROVIDER_LATCH, true)
  const mock = harness()
  const states = []
  const controller = createRealtimeVoiceController({
    dependencies: { ...mock.dependencies, networkAccess: 'provider' },
    onStateChange: state => states.push(state.phase),
  })
  const state = await controller.connect(consent())
  assert.equal(state.phase, 'connecting')
  assert.deepEqual(mock.calls.map(call => call[0]), ['audio', 'media', 'peer', 'sdp'])
  assert.deepEqual(states, ['requesting-microphone', 'connecting'])
})

test('missing consent blocks even the injected test transport', async () => {
  const mock = harness()
  const controller = createRealtimeVoiceController({ dependencies: mock.dependencies })
  assert.equal((await controller.connect(null)).phase, 'consent-required')
  assert.deepEqual(mock.calls, [])
})

test('mock transport owns media, WebRTC, oai-events, SDP, remote audio, and deterministic cleanup', async () => {
  const mock = harness()
  const controller = createRealtimeVoiceController({ dependencies: mock.dependencies })
  assert.equal((await controller.connect(consent())).phase, 'connecting')
  const peer = mock.peers[0]
  assert.equal(peer.label, 'oai-events')
  assert.equal(peer.tracks.length, 1)
  assert.deepEqual(peer.localDescription, { type: 'offer', sdp: 'v=0\r\nmock-offer' })
  assert.deepEqual(peer.remoteDescription, { type: 'answer', sdp: 'v=0\r\nmock-answer' })
  peer.channel.open()
  assert.equal(controller.getState().phase, 'connected')
  assert.deepEqual(peer.channel.sent.map(JSON.parse), [])
  peer.channel.emit('open')
  assert.deepEqual(peer.channel.sent.map(JSON.parse), [])

  peer.emit('track', { streams: [{ id: 'remote-stream' }] })
  await Promise.resolve()
  assert.equal(mock.calls.some(call => call[0] === 'audio' && call[1]?.id === 'remote-stream'), true)

  assert.equal(controller.sendTypedMessage(' hello '), true)
  assert.deepEqual(peer.channel.sent.map(JSON.parse), [
    {
      type: 'conversation.item.create',
      item: { type: 'message', role: 'user', content: [{ type: 'input_text', text: 'hello' }] },
    },
    { type: 'response.create' },
  ])

  controller.close()
  assert.equal(mock.track.stopCalls, 1)
  assert.equal(peer.closeCalls, 1)
  assert.equal(peer.channel.closeCalls, 1)
  assert.equal(controller.getState().phase, 'closed')
})

test('events normalize transcripts and surface interruption without trusting unknown payloads', async () => {
  const mock = harness()
  const transcriptSnapshots = []
  const controller = createRealtimeVoiceController({
    dependencies: mock.dependencies,
    onTranscriptChange: items => transcriptSnapshots.push(items),
  })
  await controller.connect(consent())
  const channel = mock.peers[0].channel
  channel.open()
  channel.emit('message', { data: JSON.stringify({ type: 'input_audio_buffer.speech_started' }) })
  assert.equal(controller.getState().phase, 'interrupted')
  channel.emit('message', { data: JSON.stringify({ type: 'input_audio_buffer.speech_stopped' }) })
  assert.equal(controller.getState().phase, 'connected')
  channel.emit('message', { data: JSON.stringify({ type: 'response.output_audio_transcript.delta', item_id: 'a1', delta: 'Good ' }) })
  channel.emit('message', { data: JSON.stringify({ type: 'response.output_audio_transcript.done', item_id: 'a1', transcript: 'Good answer.' }) })
  channel.emit('message', { data: '{not-json' })
  assert.deepEqual(controller.getTranscript(), [{ itemId: 'a1', role: 'assistant', text: 'Good answer.', final: true }])
  assert.equal(transcriptSnapshots.length, 2)
})

test('device loss, network failure, reconnect cap, and typed fallback are recoverable states', async () => {
  const mock = harness()
  const controller = createRealtimeVoiceController({ dependencies: mock.dependencies, maxReconnectAttempts: 1 })
  await controller.connect(consent())
  mock.peers[0].channel.open()
  mock.track.emit('ended')
  assert.equal(controller.getState().phase, 'device-lost')
  assert.equal((await controller.reconnect()).phase, 'connecting')
  mock.peers[1].channel.open()
  assert.deepEqual(mock.peers[1].channel.sent.map(JSON.parse), [])
  mock.peers[1].connectionState = 'disconnected'
  mock.peers[1].emit('connectionstatechange')
  assert.equal(controller.getState().phase, 'failed')
  assert.equal((await controller.reconnect()).phase, 'failed')
  assert.match(controller.getState().error, /Reconnect limit/)
  controller.useTextFallback()
  assert.equal(controller.getState().phase, 'text-fallback')
})

test('state reducer and transcript normalizer ignore invalid transitions and unknown events', () => {
  assert.equal(reduceRealtimeVoiceState(INITIAL_REALTIME_VOICE_STATE, { type: 'SPEECH_STARTED' }), INITIAL_REALTIME_VOICE_STATE)
  assert.equal(normalizeRealtimeTranscriptEvent({ type: 'session.updated' }), null)
  const update = normalizeRealtimeTranscriptEvent({
    type: 'conversation.item.input_audio_transcription.completed',
    item_id: 'u1',
    transcript: 'I built a rubric.',
  })
  assert.deepEqual(update, {
    itemId: 'u1',
    role: 'user',
    text: 'I built a rubric.',
    final: true,
    sourceEvent: 'conversation.item.input_audio_transcription.completed',
  })
  assert.deepEqual(applyTranscriptUpdate([], update), [{ itemId: 'u1', role: 'user', text: 'I built a rubric.', final: true }])
})

test('browser dependency factory mints a client secret before posting SDP to Realtime', async () => {
  const requests = []
  const audio = {
    autoplay: false,
    srcObject: null,
    pauseCalls: 0,
    playCalls: 0,
    pause() { this.pauseCalls += 1 },
    async play() { this.playCalls += 1 },
  }
  const dependencies = createBrowserRealtimeDependencies({
    assessmentSessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    remoteAudio: audio,
    async fetch(url, init) {
      requests.push({ url, init })
      if (String(url) === '/api/ai-path/realtime/session') {
        return new Response(JSON.stringify({
          clientSecret: 'ek_test_client_secret_1234567890',
          expiresAt: '2026-07-19T12:02:00.000Z',
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      }
      if (String(url) === 'https://api.openai.com/v1/realtime/calls') {
        return new Response('v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\n', {
          status: 200,
          headers: { 'content-type': 'application/sdp' },
        })
      }
      throw new Error(`unexpected browser-side provider request: ${url}`)
    },
  })
  assert.equal(await dependencies.exchangeSdp('v=0\r\noffer'), 'v=0\r\no=- 1 1 IN IP4 127.0.0.1')
  assert.equal(requests[0].url, '/api/ai-path/realtime/session')
  assert.deepEqual(JSON.parse(requests[0].init.body), {
    assessmentSessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  })
  assert.equal(requests[0].init.credentials, 'same-origin')
  assert.equal(requests[1].url, 'https://api.openai.com/v1/realtime/calls')
  assert.equal(requests[1].init.headers.Authorization, 'Bearer ek_test_client_secret_1234567890')
  assert.equal(requests[1].init.headers['Content-Type'], 'application/sdp')
  assert.equal(requests[1].init.body, 'v=0\r\noffer')
  assert.equal(requests.length, 2)
  assert.equal(String(requests[0].init.body).includes('OPENAI_API_KEY'), false)
  assert.equal(String(requests[0].init.body).includes('ek_'), false)
  const remote = { id: 'remote' }
  await dependencies.attachRemoteAudio(remote)
  assert.equal(audio.autoplay, true)
  assert.equal(audio.srcObject, remote)
  assert.equal(audio.playCalls, 1)
  await dependencies.attachRemoteAudio(null)
  assert.equal(audio.srcObject, null)
  assert.equal(audio.pauseCalls, 1)
})

test('voice transcript bridge includes typed framing and only finalized unique user evidence', () => {
  const result = buildReviewedInputsFromVoiceTranscript({
    goal: ' Build a reliable weekly brief. ',
    constraint: ' I have only three hours each week. ',
    transcript: [
      { itemId: 'partial', role: 'user', text: 'unfinished', final: false },
      { itemId: 'assistant', role: 'assistant', text: 'Tell me more.', final: true },
      { itemId: 'empty', role: 'user', text: '  ', final: true },
      { itemId: 'short', role: 'user', text: 'no', final: true },
      { itemId: 'u1', role: 'user', text: 'I built a cited workflow.', final: true },
      { itemId: 'u1', role: 'user', text: 'A duplicate item id.', final: true },
      { itemId: 'u2', role: 'user', text: '  i BUILT a cited   workflow. ', final: true },
      { itemId: 'u3', role: 'user', text: 'I tested it with a release rubric.', final: true },
    ],
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.deepEqual(result.reviewedInputs, [
    { id: 'goal', value: 'Build a reliable weekly brief.', source: 'typed-response' },
    { id: 'evidence-1', value: 'I built a cited workflow.', source: 'voice-transcript' },
    { id: 'evidence-2', value: 'I tested it with a release rubric.', source: 'voice-transcript' },
    { id: 'constraint', value: 'I have only three hours each week.', source: 'typed-response' },
  ])
})

test('voice transcript bridge caps seven evidence items and every value at 2000 characters', () => {
  const transcript = Array.from({ length: 10 }, (_, index) => ({
    itemId: `u${index}`,
    role: 'user',
    text: `Evidence ${index}: ${String(index).repeat(2_100)}`,
    final: true,
  }))
  const result = buildReviewedInputsFromVoiceTranscript({
    goal: `Goal ${'g'.repeat(2_100)}`,
    constraint: `Constraint ${'c'.repeat(2_100)}`,
    transcript,
  })
  assert.equal(result.ok, true)
  if (!result.ok) return
  const evidence = result.reviewedInputs.filter(item => item.id.startsWith('evidence-'))
  assert.equal(evidence.length, MAX_VOICE_EVIDENCE_INPUTS)
  assert.equal(result.reviewedInputs.length, 9)
  assert.equal(result.reviewedInputs.every(item => item.value.length <= MAX_REVIEWED_INPUT_CHARACTERS), true)

  const parsed = parseReviewedAssessment({ reviewedInputs: result.reviewedInputs, weeklyHours: 3 }, 'workflows')
  assert.equal(parsed.ok, true)
  if (parsed.ok) assert.equal(parsed.value.inputs.every(input => input.source === (input.id.startsWith('evidence-') ? 'voice-transcript' : 'typed-response')), true)
})

test('voice transcript bridge refuses invalid typed goal or constraint framing', () => {
  const result = buildReviewedInputsFromVoiceTranscript({
    goal: ' ',
    constraint: 'no',
    transcript: [{ itemId: 'u1', role: 'user', text: 'I built a workflow.', final: true }],
  })
  assert.equal(result.ok, false)
  if (!result.ok) assert.deepEqual(result.errors, [
    'Goal must contain at least 3 characters.',
    'Constraint must contain at least 3 characters.',
  ])
})
