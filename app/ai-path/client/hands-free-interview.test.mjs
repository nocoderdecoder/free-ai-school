import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canonicalQuestionPresentation,
  nextDiagnosticQuestionSection,
} from '../lib/constrained-question-routing.ts'
import {
  HANDS_FREE_CORE_QUESTION_COUNT,
  createHandsFreeInterviewController,
  createInitialHandsFreeInterviewState,
  reduceHandsFreeInterview,
} from './hands-free-interview.ts'
import {
  AI_PATH_REALTIME_CLIENT_PROVIDER_LATCH,
  createRealtimeVoiceController,
} from './realtime-controller.ts'
import { createVoiceConsent } from './realtime-consent.ts'

function controllerHarness(overrides = {}) {
  const calls = {
    plans: 0,
    reviews: 0,
    next: 0,
    spoken: [],
    stopped: 0,
    timers: [],
  }
  let timerId = 0
  const controller = createHandsFreeInterviewController({
    path: 'use-case',
    initialAnswers: {},
    async reviewAnswer({ sectionId, transcript, answers }) {
      calls.reviews += 1
      return {
        ok: true,
        answers: { ...answers, [sectionId]: { answer: transcript } },
        acknowledgement: `I heard your ${sectionId} example`,
      }
    },
    async requestNextQuestion({ path, completedSectionId, expectedSectionId }) {
      calls.next += 1
      if (!expectedSectionId) return { action: 'complete' }
      assert.equal(expectedSectionId, nextDiagnosticQuestionSection(path, completedSectionId))
      return {
        action: 'advance',
        presentation: canonicalQuestionPresentation(path, expectedSectionId),
      }
    },
    async generatePlan({ answers }) {
      calls.plans += 1
      return { answerCount: Object.keys(answers).length }
    },
    async speak(input) { calls.spoken.push(input) },
    stopSpeaking() { calls.stopped += 1 },
    scheduleTimeout(callback, delayMs) {
      const timer = { id: ++timerId, callback, delayMs, cleared: false }
      calls.timers.push(timer)
      return timer
    },
    clearScheduledTimeout(timer) { timer.cleared = true },
    ...overrides,
  })
  return { calls, controller }
}

test('hands-free interview asks six governed questions, then generates exactly one plan', async () => {
  const { calls, controller } = controllerHarness()
  assert.equal((await controller.start()).phase, 'listening')

  for (let question = 1; question <= HANDS_FREE_CORE_QUESTION_COUNT; question += 1) {
    controller.notifySpeechStarted()
    const state = await controller.submitFinalTranscript({
      itemId: `turn-${question}`,
      text: `For question ${question}, I use a concrete recurring workflow and review the result with a colleague.`,
    })
    if (question < HANDS_FREE_CORE_QUESTION_COUNT) {
      assert.equal(state.phase, 'listening')
      assert.equal(state.coreQuestionNumber, question + 1)
    } else {
      assert.equal(state.phase, 'reviewing')
      assert.equal(state.acceptedAnswerCount, HANDS_FREE_CORE_QUESTION_COUNT)
    }
  }

  assert.equal(controller.getTranscript().length, HANDS_FREE_CORE_QUESTION_COUNT)
  assert.equal(calls.reviews, HANDS_FREE_CORE_QUESTION_COUNT)
  assert.equal(calls.next, HANDS_FREE_CORE_QUESTION_COUNT)
  assert.equal(calls.plans, 0)
  assert.equal((await controller.confirmTranscript()).phase, 'complete')
  assert.equal(calls.plans, 1)
  assert.deepEqual(controller.getPlan(), { answerCount: HANDS_FREE_CORE_QUESTION_COUNT })
})

test('an early provider completion cannot generate a plan before four accepted answers', async () => {
  const { calls, controller } = controllerHarness({
    async requestNextQuestion() { return { action: 'complete' } },
  })
  await controller.start()
  controller.notifySpeechStarted()
  const review = await controller.submitFinalTranscript({
    itemId: 'early-turn',
    text: 'I currently draft each update manually and then check it against the approved source notes.',
  })
  assert.equal(review.phase, 'failed')
  assert.equal(review.acceptedAnswerCount, 0)

  const unchanged = await controller.confirmTranscript()
  assert.equal(unchanged.phase, 'failed')
  assert.equal(calls.plans, 0)
  assert.equal(controller.getPlan(), null)
})

test('silence and gibberish exhaust one repair, then require the typed fallback', async () => {
  const { calls, controller } = controllerHarness()
  await controller.start()
  const activeTimer = calls.timers.find(timer => !timer.cleared)
  assert.ok(activeTimer)
  assert.ok(activeTimer.delayMs >= 8_000 && activeTimer.delayMs <= 90_000)
  activeTimer.callback()
  await Promise.resolve()
  await Promise.resolve()
  assert.equal(controller.getState().repairAttempt, 1)
  assert.match(calls.spoken.at(-1).text, /concrete example|not tried/i)
  assert.equal(controller.getTranscript().length, 0)

  controller.notifySpeechStarted()
  const repaired = await controller.submitFinalTranscript({
    itemId: 'gibberish',
    text: 'xyz xyz xyz fasdfasdf',
  })
  assert.equal(repaired.phase, 'failed')
  assert.equal(repaired.repairAttempt, 1)
  assert.equal(repaired.issue, 'answer-needs-typed-fallback')
  assert.equal(calls.reviews, 0)
  assert.equal(controller.getTranscript().length, 0)
})

test('a duplicate transcript item never reviews or advances twice', async () => {
  const { calls, controller } = controllerHarness()
  await controller.start()
  controller.notifySpeechStarted()
  await controller.submitFinalTranscript({
    itemId: 'same-provider-item',
    text: 'I gather the weekly inputs manually and review them with the account owner before publishing.',
  })
  const before = controller.getState()
  const duplicate = await controller.submitFinalTranscript({
    itemId: 'same-provider-item',
    text: 'A duplicated final transcription must never be counted again by the interview.',
  })
  assert.equal(duplicate, before)
  assert.equal(calls.reviews, 1)
  assert.equal(calls.next, 1)
  assert.equal(controller.getTranscript().length, 1)
})

test('a stale asynchronous review cannot mutate a closed session', async () => {
  let resolveReview
  const { calls, controller } = controllerHarness({
    reviewAnswer() {
      calls.reviews += 1
      return new Promise(resolve => { resolveReview = resolve })
    },
  })
  await controller.start()
  controller.notifySpeechStarted()
  const pending = controller.submitFinalTranscript({
    itemId: 'slow-review',
    text: 'I manually combine campaign results before checking the draft with the marketing lead.',
  })
  assert.equal(controller.getState().phase, 'analyzing')
  controller.close()
  resolveReview({ ok: true, answers: { outcome: { answer: 'accepted too late' } }, acknowledgement: 'Understood' })
  await pending
  assert.equal(controller.getState().phase, 'closed')
  assert.equal(calls.next, 0)
  assert.equal(controller.getTranscript().length, 0)
})

test('transcript edits accept only known substantive turns and reach the plan handoff', async () => {
  let finalizedTranscript = null
  const { controller } = controllerHarness({
    async finalizeTranscript({ transcript, currentAnswers }) {
      finalizedTranscript = transcript
      return { ...currentAnswers, edited: transcript.map(turn => turn.answer) }
    },
  })
  await controller.start()
  for (let question = 1; question <= HANDS_FREE_CORE_QUESTION_COUNT; question += 1) {
    controller.notifySpeechStarted()
    await controller.submitFinalTranscript({
      itemId: `edit-turn-${question}`,
      text: `My concrete answer ${question} describes the current work, the people involved, and how I review it.`,
    })
  }
  const before = controller.getTranscript()
  controller.updateTranscript({ itemId: 'unknown-turn', text: 'This otherwise substantive edit targets no accepted item.' })
  controller.updateTranscript({ itemId: 'edit-turn-1', text: 'xyz xyz xyz' })
  assert.deepEqual(controller.getTranscript(), before)

  controller.updateTranscript({
    itemId: 'edit-turn-1',
    text: 'I collect campaign inputs manually, draft the plan with AI, and ask the channel owner to approve it.',
  })
  assert.match(controller.getTranscript()[0].answer, /channel owner to approve/i)
  assert.equal((await controller.confirmTranscript()).phase, 'complete')
  assert.match(finalizedTranscript[0].answer, /channel owner to approve/i)
})

test('user speech interrupts advisor audio and preserves the current question', async () => {
  let resolveSpeech
  const { calls, controller } = controllerHarness({
    speak(input) {
      calls.spoken.push(input)
      return new Promise(resolve => { resolveSpeech = resolve })
    },
  })
  const initialQuestion = createInitialHandsFreeInterviewState('use-case').question
  const starting = controller.start()
  assert.equal(controller.getState().phase, 'advisor-speaking')
  assert.equal(controller.notifySpeechStarted().phase, 'user-speaking')
  assert.equal(calls.stopped, 1)
  resolveSpeech()
  await starting
  assert.equal(controller.getState().phase, 'user-speaking')
  assert.equal(controller.getState().question.variantId, initialQuestion.variantId)
})

test('pure state rejects empty transcript, out-of-order completion, and plan readiness', () => {
  const initial = createInitialHandsFreeInterviewState('capability-growth')
  assert.equal(reduceHandsFreeInterview(initial, { type: 'FINAL_TRANSCRIPT', characterCount: 0 }), initial)
  assert.equal(reduceHandsFreeInterview(initial, { type: 'PLAN_READY' }), initial)
  assert.equal(reduceHandsFreeInterview(initial, { type: 'GENERATE_PLAN' }), initial)
})

test('microphone denial is bounded and cannot begin peer, SDP, or provider work', async () => {
  let mediaCalls = 0
  let peerCalls = 0
  let sdpCalls = 0
  const controller = createRealtimeVoiceController({
    dependencies: {
      networkAccess: 'none',
      async getUserMedia() {
        mediaCalls += 1
        throw new DOMException('A raw browser detail that must not escape.', 'NotAllowedError')
      },
      createPeerConnection() { peerCalls += 1; throw new Error('must not run') },
      async exchangeSdp() { sdpCalls += 1; throw new Error('must not run') },
      attachRemoteAudio() {},
    },
  })
  const consent = createVoiceConsent({
    audioStreamingAccepted: true,
    transcriptReviewAccepted: true,
    now: () => new Date('2026-07-19T12:00:00.000Z'),
  })
  const state = await controller.connect(consent)
  assert.equal(state.phase, 'failed')
  assert.equal(state.error, 'Microphone permission was not granted.')
  assert.equal(mediaCalls, 1)
  assert.equal(peerCalls, 0)
  assert.equal(sdpCalls, 0)
  controller.useTextFallback()
  assert.equal(controller.getState().phase, 'text-fallback')
})

test('approved provider latch still requires explicit voice consent before transport work', async () => {
  assert.equal(AI_PATH_REALTIME_CLIENT_PROVIDER_LATCH, true)
  const sideEffects = []
  const stream = {
    getTracks: () => [],
    getAudioTracks: () => [],
  }
  const controller = createRealtimeVoiceController({
    dependencies: {
      networkAccess: 'provider',
      async getUserMedia() { sideEffects.push('media'); return stream },
      createPeerConnection() {
        sideEffects.push('peer')
        return {
          connectionState: 'new',
          addTrack() {},
          createDataChannel() {
            return {
              readyState: 'connecting',
              send() {},
              close() {},
              addEventListener() {},
              removeEventListener() {},
            }
          },
          async createOffer() { return { type: 'offer', sdp: 'v=0\r\noffer' } },
          async setLocalDescription() {},
          async setRemoteDescription() {},
          addEventListener() {},
          removeEventListener() {},
          close() {},
        }
      },
      async exchangeSdp() { sideEffects.push('sdp'); return 'v=0\r\nanswer' },
      attachRemoteAudio() { sideEffects.push('audio') },
    },
  })
  assert.equal((await controller.connect(null)).phase, 'consent-required')
  assert.deepEqual(sideEffects, [])
  const consent = createVoiceConsent({
    audioStreamingAccepted: true,
    transcriptReviewAccepted: true,
    now: () => new Date('2026-07-19T12:00:00.000Z'),
  })
  assert.equal((await controller.connect(consent)).phase, 'connecting')
  assert.deepEqual(sideEffects, ['audio', 'media', 'peer', 'sdp'])
})
