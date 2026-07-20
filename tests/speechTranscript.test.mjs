import assert from 'node:assert/strict'
import test from 'node:test'
import speechModule from '../app/lib/speechTranscript.ts'

const {
  cleanVoiceTranscript,
  joinSpeechText,
  resolvedSpeechLanguage,
  uniqueTranscriptAlternatives,
} = speechModule

test('turns spoken punctuation into readable sentences', () => {
  assert.equal(
    cleanVoiceTranscript('i want an assistant comma it should draft emails full stop new paragraph it must ask before sending'),
    'I want an assistant, it should draft emails.\n\nIt must ask before sending.',
  )
})

test('cleans spacing and can keep an unfinished interim segment open', () => {
  assert.equal(cleanVoiceTranscript('this is useful question mark'), 'This is useful?')
  assert.equal(cleanVoiceTranscript('this is still interim', false), 'This is still interim')
  assert.equal(joinSpeechText('An existing sentence.', 'Another thought'), 'An existing sentence. Another thought')
})

test('uses the selected speech language or browser language fallback', () => {
  assert.equal(resolvedSpeechLanguage('en-IN', 'en-US'), 'en-IN')
  assert.equal(resolvedSpeechLanguage('auto', 'en-GB'), 'en-GB')
  assert.equal(resolvedSpeechLanguage('auto'), 'en-US')
})

test('deduplicates and limits recognition alternatives', () => {
  assert.deepEqual(
    uniqueTranscriptAlternatives(['build an AI app', 'Build an AI app.', 'build a safe AI app', 'build an AI agent'], 'Build an AI app.'),
    ['Build a safe AI app.', 'Build an AI agent.'],
  )
})
