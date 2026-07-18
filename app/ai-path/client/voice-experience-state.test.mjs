import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import {
  INITIAL_VOICE_EXPERIENCE_STATE,
  MAX_VOICE_RECONNECT_ATTEMPTS,
  VOICE_EXPERIENCE_PHASES,
  reduceVoiceExperienceState,
  transitionVoiceExperience,
} from './voice-experience-state.ts'

function follow(events, initial = INITIAL_VOICE_EXPERIENCE_STATE) {
  return events.reduce(reduceVoiceExperienceState, initial)
}

test('voice path progresses through sound check, live conversation, review, generation, and path', () => {
  const events = [
    { type: 'BEGIN_VOICE' },
    { type: 'MICROPHONE_READY' },
    { type: 'CONNECTION_ESTABLISHED' },
    { type: 'USER_SPEECH_STARTED' },
    { type: 'USER_SPEECH_ENDED' },
    { type: 'ADVISOR_RESPONSE_STARTED' },
    { type: 'ADVISOR_RESPONSE_ENDED' },
    { type: 'VOICE_INTERVIEW_COMPLETE' },
    { type: 'CONFIRM_UNDERSTANDING' },
    { type: 'PATH_READY' },
  ]
  const phases = []
  let state = INITIAL_VOICE_EXPERIENCE_STATE
  for (const event of events) {
    const result = transitionVoiceExperience(state, event)
    assert.equal(result.accepted, true, `${event.type} should be accepted from ${state.phase}`)
    state = result.state
    phases.push(state.phase)
  }
  assert.deepEqual(phases, [
    'sound-check',
    'connecting',
    'listening',
    'user-speaking',
    'thinking',
    'advisor-speaking',
    'listening',
    'understanding-review',
    'generating',
    'path',
  ])
  assert.deepEqual(state, { phase: 'path', mode: 'voice', reconnectAttempt: 0, issue: null })
})

test('speaking while the advisor is speaking is a supported interruption', () => {
  const speaking = follow([
    { type: 'BEGIN_VOICE' },
    { type: 'MICROPHONE_READY' },
    { type: 'CONNECTION_ESTABLISHED' },
    { type: 'USER_SPEECH_STARTED' },
    { type: 'USER_SPEECH_ENDED' },
    { type: 'ADVISOR_RESPONSE_STARTED' },
  ])
  assert.equal(speaking.phase, 'advisor-speaking')
  const interrupted = transitionVoiceExperience(speaking, { type: 'USER_SPEECH_STARTED' })
  assert.equal(interrupted.accepted, true)
  assert.equal(interrupted.state.phase, 'user-speaking')
})

test('typed fallback can complete the same review and path gates without voice', () => {
  const review = follow([
    { type: 'BEGIN_TYPED' },
    { type: 'TYPED_INTERVIEW_COMPLETE' },
  ])
  assert.deepEqual(review, { phase: 'understanding-review', mode: 'typed', reconnectAttempt: 0, issue: null })
  assert.equal(reduceVoiceExperienceState(review, { type: 'CONTINUE_CONVERSATION' }).phase, 'typed-fallback')

  const path = follow([
    { type: 'CONFIRM_UNDERSTANDING' },
    { type: 'PATH_READY' },
  ], review)
  assert.deepEqual(path, { phase: 'path', mode: 'typed', reconnectAttempt: 0, issue: null })
})

test('path generation failures return to the reviewed understanding without losing the selected mode', () => {
  const generating = follow([
    { type: 'BEGIN_TYPED' },
    { type: 'TYPED_INTERVIEW_COMPLETE' },
    { type: 'CONFIRM_UNDERSTANDING' },
  ])
  assert.deepEqual(reduceVoiceExperienceState(generating, { type: 'PATH_FAILED' }), {
    phase: 'understanding-review', mode: 'typed', reconnectAttempt: 0, issue: null,
  })
})

test('microphone denial exposes only a bounded issue and preserves typed fallback', () => {
  const denied = follow([
    { type: 'BEGIN_VOICE' },
    { type: 'MICROPHONE_PERMISSION_DENIED' },
  ])
  assert.deepEqual(denied, {
    phase: 'permission-denied',
    mode: 'voice',
    reconnectAttempt: 0,
    issue: 'microphone-permission-denied',
  })
  assert.deepEqual(reduceVoiceExperienceState(denied, { type: 'RETRY_MICROPHONE' }), {
    phase: 'sound-check', mode: 'voice', reconnectAttempt: 0, issue: null,
  })
  assert.deepEqual(reduceVoiceExperienceState(denied, { type: 'USE_TYPED_FALLBACK' }), {
    phase: 'typed-fallback', mode: 'typed', reconnectAttempt: 0, issue: null,
  })
})

test('reconnection is bounded and restores to the safest live state', () => {
  let state = follow([
    { type: 'BEGIN_VOICE' },
    { type: 'MICROPHONE_READY' },
    { type: 'CONNECTION_ESTABLISHED' },
  ])
  for (let attempt = 1; attempt <= MAX_VOICE_RECONNECT_ATTEMPTS; attempt += 1) {
    state = reduceVoiceExperienceState(state, { type: 'CONNECTION_LOST' })
    assert.deepEqual(state, { phase: 'reconnecting', mode: 'voice', reconnectAttempt: attempt, issue: null })
    state = reduceVoiceExperienceState(state, { type: 'CONNECTION_ESTABLISHED' })
    assert.deepEqual(state, { phase: 'listening', mode: 'voice', reconnectAttempt: attempt, issue: null })
  }
  state = reduceVoiceExperienceState(state, { type: 'CONNECTION_LOST' })
  assert.deepEqual(state, {
    phase: 'service-unavailable',
    mode: 'voice',
    reconnectAttempt: MAX_VOICE_RECONNECT_ATTEMPTS,
    issue: 'reconnect-limit-reached',
  })
  assert.equal(reduceVoiceExperienceState(state, { type: 'RETRY_SERVICE' }).phase, 'connecting')
  assert.equal(reduceVoiceExperienceState(state, { type: 'USE_TYPED_FALLBACK' }).phase, 'typed-fallback')
})

test('service failures cannot expose raw provider details in state', () => {
  const connecting = follow([{ type: 'BEGIN_VOICE' }, { type: 'MICROPHONE_READY' }])
  const unavailable = reduceVoiceExperienceState(connecting, { type: 'SERVICE_UNAVAILABLE' })
  assert.deepEqual(unavailable, {
    phase: 'service-unavailable',
    mode: 'voice',
    reconnectAttempt: 0,
    issue: 'service-unavailable',
  })
  assert.equal(Object.keys(unavailable).some(key => /provider|credential|network/i.test(key)), false)
})

test('state model has no media, network, environment, or credential access surface', () => {
  const source = readFileSync(new URL('./voice-experience-state.ts', import.meta.url), 'utf8')
  for (const forbidden of [
    /\bfetch\s*\(/,
    /\bWebSocket\b/,
    /\bRTCPeerConnection\b/,
    /\bgetUserMedia\b/,
    /\bprocess\.env\b/,
    /\bAPI_KEY\b/,
    /\bAuthorization\b/,
  ]) {
    assert.doesNotMatch(source, forbidden)
  }
})

test('invalid and unknown transitions fail closed with the exact current state', () => {
  const state = INITIAL_VOICE_EXPERIENCE_STATE
  for (const event of [
    { type: 'PATH_READY' },
    { type: 'CONFIRM_UNDERSTANDING' },
    { type: 'CONNECTION_ESTABLISHED' },
    { type: 'VOICE_INTERVIEW_COMPLETE' },
    { type: 'UNKNOWN_EVENT' },
  ]) {
    const first = transitionVoiceExperience(state, event)
    const second = transitionVoiceExperience(state, event)
    assert.equal(first.accepted, false)
    assert.equal(first.reason, 'invalid-transition')
    assert.equal(first.state, state)
    assert.deepEqual(first, second)
  }
})

test('every declared phase is immutable and reacts deterministically to every event', () => {
  const events = [
    'BEGIN_VOICE', 'BEGIN_TYPED', 'MICROPHONE_READY', 'MICROPHONE_PERMISSION_DENIED',
    'CONNECTION_ESTABLISHED', 'CONNECTION_LOST', 'SERVICE_UNAVAILABLE',
    'USER_SPEECH_STARTED', 'USER_SPEECH_ENDED', 'ADVISOR_RESPONSE_STARTED',
    'ADVISOR_RESPONSE_ENDED', 'VOICE_INTERVIEW_COMPLETE', 'TYPED_INTERVIEW_COMPLETE',
    'CONTINUE_CONVERSATION', 'CONFIRM_UNDERSTANDING', 'PATH_READY', 'PATH_FAILED',
    'RETRY_MICROPHONE', 'RETRY_SERVICE', 'USE_TYPED_FALLBACK', 'RETURN_TO_VOICE', 'START_OVER',
  ]
  for (const phase of VOICE_EXPERIENCE_PHASES) {
    const mode = phase === 'welcome' ? null : phase === 'typed-fallback' ? 'typed' : 'voice'
    const state = Object.freeze({ phase, mode, reconnectAttempt: 0, issue: null })
    for (const type of events) {
      const first = transitionVoiceExperience(state, { type })
      const second = transitionVoiceExperience(state, { type })
      assert.deepEqual(first, second, `${phase} + ${type} must be deterministic`)
      assert.equal(Object.isFrozen(first.state), true)
      assert.ok(VOICE_EXPERIENCE_PHASES.includes(first.state.phase))
    }
  }
})
