import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createMicrophonePreflightController,
} from './microphone-preflight.ts'
import {
  resolveVoiceProviderAvailability,
  VOICE_PROVIDER_UNAVAILABLE,
} from './voice-provider-availability.ts'
import { createVoiceReadyBrowserDependencies } from './voice-ready-browser.ts'

function deferred() {
  let resolve
  const promise = new Promise(next => { resolve = next })
  return { promise, resolve }
}

function harness() {
  const calls = []
  const listeners = new Map()
  const tracks = []
  const contexts = []
  const frames = new Map()
  let frameId = 0
  const mediaDevices = {
    async getUserMedia(constraints) {
      calls.push(['media', constraints])
      const track = { stopCalls: 0, stop() { this.stopCalls += 1 } }
      tracks.push(track)
      return { getTracks: () => [track] }
    },
    async enumerateDevices() {
      calls.push(['enumerate'])
      return [
        { kind: 'audiooutput', deviceId: 'speaker', label: 'Speaker' },
        { kind: 'audioinput', deviceId: 'default', label: 'MacBook microphone' },
        { kind: 'audioinput', deviceId: 'usb', label: 'USB microphone' },
      ]
    },
    addEventListener(type, listener) { listeners.set(type, listener) },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type) },
  }
  const dependencies = {
    getMediaDevices: () => mediaDevices,
    createAudioContext() {
      const analyser = {
        fftSize: 0,
        smoothingTimeConstant: 0,
        frequencyBinCount: 4,
        disconnectCalls: 0,
        disconnect() { this.disconnectCalls += 1 },
        getByteTimeDomainData(values) { values.set([128, 160, 128, 96]) },
      }
      const source = {
        connectCalls: 0,
        disconnectCalls: 0,
        connect() { this.connectCalls += 1 },
        disconnect() { this.disconnectCalls += 1 },
      }
      const context = {
        state: 'running',
        analyser,
        source,
        closeCalls: 0,
        createAnalyser: () => analyser,
        createMediaStreamSource: () => source,
        async close() { this.closeCalls += 1 },
      }
      contexts.push(context)
      return context
    },
    requestAnimationFrame(callback) { const id = ++frameId; frames.set(id, callback); return id },
    cancelAnimationFrame(id) { frames.delete(id) },
  }
  return { calls, tracks, contexts, frames, listeners, dependencies }
}

test('preflight remains local and requests microphone only after explicit start', async () => {
  const mock = harness()
  const controller = createMicrophonePreflightController(mock.dependencies)
  assert.deepEqual(mock.calls, [])
  await controller.refreshDevices()
  assert.deepEqual(mock.calls, [['enumerate']])
  assert.equal(controller.getSnapshot().selectedDeviceId, 'default')
  assert.equal(mock.calls.some(call => call[0] === 'media'), false)

  const state = await controller.start('usb')
  assert.equal(state.phase, 'ready')
  assert.equal(state.selectedDeviceId, 'usb')
  assert.deepEqual(mock.calls.find(call => call[0] === 'media'), ['media', {
    audio: { deviceId: { exact: 'usb' } },
    video: false,
  }])
  assert.equal(mock.contexts[0].source.connectCalls, 1)
  assert.equal(mock.frames.size, 1)
  const [frameHandle, frame] = [...mock.frames.entries()][0]
  mock.frames.delete(frameHandle)
  frame()
  assert.ok(controller.getSnapshot().level > 0)

  controller.stop()
  await Promise.resolve()
  assert.equal(mock.tracks[0].stopCalls, 1)
  assert.equal(mock.contexts[0].closeCalls, 1)
  assert.equal(mock.contexts[0].source.disconnectCalls, 1)
  assert.equal(mock.frames.size, 0)
  assert.equal(controller.getSnapshot().phase, 'stopped')
})

test('changing devices stops the previous stream and reacquires only the selected input', async () => {
  const mock = harness()
  const controller = createMicrophonePreflightController(mock.dependencies)
  await controller.refreshDevices()
  await controller.start('default')
  await controller.selectDevice('usb')
  await Promise.resolve()
  assert.equal(mock.tracks[0].stopCalls, 1)
  assert.equal(mock.contexts[0].closeCalls, 1)
  assert.deepEqual(mock.calls.filter(call => call[0] === 'media').map(call => call[1]), [
    { audio: { deviceId: { exact: 'default' } }, video: false },
    { audio: { deviceId: { exact: 'usb' } }, video: false },
  ])
  controller.destroy()
  await Promise.resolve()
  assert.equal(mock.tracks[1].stopCalls, 1)
  assert.equal(mock.contexts[1].closeCalls, 1)
  assert.equal(mock.listeners.size, 0)
})

test('destroying during a pending permission request stops the late stream', async () => {
  const mock = harness()
  const pending = deferred()
  const lateTrack = { stopCalls: 0, stop() { this.stopCalls += 1 } }
  mock.dependencies.getMediaDevices().getUserMedia = () => pending.promise
  const controller = createMicrophonePreflightController(mock.dependencies)
  const starting = controller.start()
  controller.destroy()
  pending.resolve({ getTracks: () => [lateTrack] })
  await starting
  assert.equal(lateTrack.stopCalls, 1)
})

test('permission errors are bounded and keep typed fallback available', async () => {
  const mock = harness()
  mock.dependencies.getMediaDevices().getUserMedia = async () => { throw { name: 'NotAllowedError', privateDetail: 'do not expose' } }
  const controller = createMicrophonePreflightController(mock.dependencies)
  const state = await controller.start()
  assert.equal(state.phase, 'permission-denied')
  assert.match(state.error, /continue by typing/i)
  assert.doesNotMatch(state.error, /privateDetail|expose/)
})

test('provider availability cannot become ready from one side alone', () => {
  assert.equal(resolveVoiceProviderAvailability({ clientReady: true, serverReady: false }), VOICE_PROVIDER_UNAVAILABLE)
  assert.equal(resolveVoiceProviderAvailability({ clientReady: false, serverReady: true }), VOICE_PROVIDER_UNAVAILABLE)
  assert.equal(resolveVoiceProviderAvailability({ clientReady: true, serverReady: true }).canStart, true)
})

test('voice-ready browser adapter preserves the selected input without touching media or network at construction', async () => {
  const media = []
  const network = []
  const dependencies = createVoiceReadyBrowserDependencies({
    assessmentSessionId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    selectedDeviceId: 'usb',
    remoteAudio: { autoplay: false, srcObject: null, pause() {}, async play() {} },
    async getUserMedia(constraints) { media.push(constraints); return { id: 'stream' } },
    async fetch(url, init) { network.push([url, init]); return new Response('v=0\r\nanswer') },
    createPeerConnection() { return { id: 'peer' } },
  })
  assert.deepEqual(media, [])
  assert.deepEqual(network, [])
  await dependencies.getUserMedia({ audio: true })
  assert.deepEqual(media, [{ audio: { deviceId: { exact: 'usb' } }, video: false }])
})
