export type ReviewedInput = {
  id: string
  value: string
}

export type ReviewedAssessmentInput = {
  assessmentSessionId?: string
  goal: string
  goalType: string
  weeklyHours: number
  reviewedInputs: ReviewedInput[]
}

export function buildAnalysisPayload(input: ReviewedAssessmentInput) {
  return {
    assessmentSessionId: input.assessmentSessionId,
    goal: input.goal,
    goalType: input.goalType,
    weeklyHours: Math.max(1, Math.min(20, Math.round(input.weeklyHours))),
    reviewedInputs: input.reviewedInputs.map(item => ({ id: item.id, value: item.value.trim() })),
    freeOnly: true,
    formats: ['reading', 'course', 'project', 'reference'],
    limit: 4,
  }
}
