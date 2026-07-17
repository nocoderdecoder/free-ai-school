export type VoiceTranscriptRole = 'user' | 'assistant'

export type VoiceTranscriptUpdate = Readonly<{
  itemId: string
  role: VoiceTranscriptRole
  text: string
  final: boolean
  sourceEvent: string
}>

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null
}

function textFrom(event: Record<string, unknown>, final: boolean) {
  const candidate = final ? event.transcript ?? event.text : event.delta
  return typeof candidate === 'string' ? candidate : ''
}

/**
 * Normalizes the current unified Realtime transcript events plus their older
 * audio-transcript aliases. Unknown events are deliberately ignored.
 */
export function normalizeRealtimeTranscriptEvent(value: unknown): VoiceTranscriptUpdate | null {
  const event = record(value)
  if (!event || typeof event.type !== 'string') return null

  const types: Record<string, { role: VoiceTranscriptRole; final: boolean }> = {
    'conversation.item.input_audio_transcription.delta': { role: 'user', final: false },
    'conversation.item.input_audio_transcription.completed': { role: 'user', final: true },
    'response.output_audio_transcript.delta': { role: 'assistant', final: false },
    'response.output_audio_transcript.done': { role: 'assistant', final: true },
    'response.audio_transcript.delta': { role: 'assistant', final: false },
    'response.audio_transcript.done': { role: 'assistant', final: true },
  }
  const match = types[event.type]
  if (!match) return null
  const text = textFrom(event, match.final)
  if (!text) return null
  const itemId = typeof event.item_id === 'string'
    ? event.item_id
    : typeof event.response_id === 'string' ? event.response_id : ''
  if (!itemId) return null
  return Object.freeze({ itemId, role: match.role, text, final: match.final, sourceEvent: event.type })
}

export type VoiceTranscriptItem = Readonly<{
  itemId: string
  role: VoiceTranscriptRole
  text: string
  final: boolean
}>

export function applyTranscriptUpdate(
  items: readonly VoiceTranscriptItem[],
  update: VoiceTranscriptUpdate,
): readonly VoiceTranscriptItem[] {
  const index = items.findIndex(item => item.itemId === update.itemId && item.role === update.role)
  if (index < 0) return Object.freeze([...items, Object.freeze({
    itemId: update.itemId,
    role: update.role,
    text: update.text,
    final: update.final,
  })])
  const current = items[index]
  const text = update.final
    ? update.text
    : current.final ? current.text : `${current.text}${update.text}`
  const next = [...items]
  next[index] = Object.freeze({ ...current, text, final: current.final || update.final })
  return Object.freeze(next)
}
