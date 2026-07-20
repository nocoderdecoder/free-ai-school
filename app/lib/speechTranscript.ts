export const speechLanguageOptions = [
  { value: 'auto', label: 'Automatic' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'hi-IN', label: 'Hindi (India)' },
] as const

const spokenPunctuation: Array<[RegExp, string]> = [
  [/\bnew paragraph\b/gi, '\n\n'],
  [/\bnew line\b/gi, '\n'],
  [/\bquestion mark\b/gi, '?'],
  [/\bexclamation (?:mark|point)\b/gi, '!'],
  [/\bfull stop\b/gi, '.'],
  [/\bsemicolon\b/gi, ';'],
  [/\bcolon\b/gi, ':'],
  [/\bcomma\b/gi, ','],
]

export function resolvedSpeechLanguage(selection: string, browserLanguage?: string) {
  if (selection !== 'auto') return selection
  return browserLanguage?.trim() || 'en-US'
}

export function joinSpeechText(existing: string, addition: string) {
  const left = existing.trimEnd()
  const right = addition.trimStart()
  if (!left) return right
  if (!right) return left
  if (/\n$/.test(left) || /^[,.;:!?]/.test(right)) return `${left}${right}`
  return `${left} ${right}`
}

export function cleanVoiceTranscript(value: string, finish = true) {
  let text = value.trim()
  for (const [pattern, punctuation] of spokenPunctuation) text = text.replace(pattern, punctuation)

  text = text
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/([,;:])(?=[^\s\n])/g, '$1 ')
    .replace(/([.!?])(?=[^\s\n])/g, '$1 ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/(^|[.!?]\s+|\n+)([a-z])/g, (_match, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`)

  if (finish && text && !/[.!?]$/.test(text)) text += '.'
  return text
}

export function uniqueTranscriptAlternatives(values: string[], primary: string, maximum = 2) {
  const seen = new Set([primary.trim().toLocaleLowerCase()])
  const alternatives: string[] = []
  for (const value of values) {
    const normalized = cleanVoiceTranscript(value)
    const key = normalized.toLocaleLowerCase()
    if (!normalized || seen.has(key)) continue
    seen.add(key)
    alternatives.push(normalized)
    if (alternatives.length === maximum) break
  }
  return alternatives
}
