export type ReviewedInput = {
  id: string
  value: string
  source?: 'voice-transcript' | 'typed-response'
}

export type ReviewedAssessmentInput = {
  assessmentSessionId?: string
  goal: string
  goalType: string
  weeklyHours: number
  codingComfort: string
  reviewedInputs: ReviewedInput[]
}

export type CodingPreference = 'no-code' | 'light-code' | 'code-ready'

export function codingPreferenceFromComfort(value: string): CodingPreference {
  if (/\b(?:no coding|no[- ]?code|without code|non[- ]?technical)\b/i.test(value)) return 'no-code'
  if (/\b(?:professional|engineer|developer|comfortable|api|code-first|python|javascript|typescript)\b/i.test(value)) return 'code-ready'
  return 'light-code'
}

export function buildAnalysisPayload(input: ReviewedAssessmentInput) {
  return {
    assessmentSessionId: input.assessmentSessionId,
    goal: input.goal,
    goalType: input.goalType,
    weeklyHours: Math.max(1, Math.min(20, Math.round(input.weeklyHours))),
    codingPreference: codingPreferenceFromComfort(input.codingComfort),
    reviewedInputs: input.reviewedInputs.map(item => ({
      id: item.id,
      value: item.value.trim(),
      ...(item.source ? { source: item.source } : {}),
    })),
    freeOnly: true,
    formats: ['reading', 'course', 'project', 'reference'],
    limit: 4,
  }
}
