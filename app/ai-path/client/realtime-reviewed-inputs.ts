import type { ReviewedInput } from './analysis-payload.ts'
import type { VoiceTranscriptItem } from './realtime-transcript.ts'

export const MAX_VOICE_EVIDENCE_INPUTS = 7 as const
export const MAX_REVIEWED_INPUT_CHARACTERS = 2_000 as const

export type VoiceReviewedInputBridgeResult =
  | { ok: true; reviewedInputs: ReviewedInput[] }
  | { ok: false; errors: string[] }

function boundedTypedValue(value: string, label: string, errors: string[]) {
  const trimmed = value.trim().slice(0, MAX_REVIEWED_INPUT_CHARACTERS)
  if (trimmed.length < 3) errors.push(`${label} must contain at least 3 characters.`)
  return trimmed
}

function duplicateKey(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

/**
 * Converts reviewed voice transcript state into the exact bounded input IDs
 * accepted by reviewed-assessment. Assistant and unfinished text never crosses
 * this application-owned assessment boundary.
 */
export function buildReviewedInputsFromVoiceTranscript(input: Readonly<{
  goal: string
  constraint: string
  transcript: readonly VoiceTranscriptItem[]
}>): VoiceReviewedInputBridgeResult {
  const errors: string[] = []
  const goal = boundedTypedValue(input.goal, 'Goal', errors)
  const constraint = boundedTypedValue(input.constraint, 'Constraint', errors)
  if (errors.length) return { ok: false, errors }

  const seenItemIds = new Set<string>()
  const seenText = new Set<string>()
  const evidence: ReviewedInput[] = []
  for (const item of input.transcript) {
    if (evidence.length >= MAX_VOICE_EVIDENCE_INPUTS) break
    if (item.role !== 'user' || item.final !== true) continue
    const itemId = item.itemId.trim()
    const value = item.text.trim().slice(0, MAX_REVIEWED_INPUT_CHARACTERS)
    if (!itemId || value.length < 3) continue
    const textKey = duplicateKey(value)
    if (seenItemIds.has(itemId) || seenText.has(textKey)) continue
    seenItemIds.add(itemId)
    seenText.add(textKey)
    evidence.push({
      id: `evidence-${evidence.length + 1}`,
      value,
      source: 'voice-transcript',
    })
  }

  return {
    ok: true,
    reviewedInputs: [
      { id: 'goal', value: goal, source: 'typed-response' },
      ...evidence,
      { id: 'constraint', value: constraint, source: 'typed-response' },
    ],
  }
}
