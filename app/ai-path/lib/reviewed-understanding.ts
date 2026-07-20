export const MINIMUM_REVIEWED_INPUTS = 2

type ReviewableInput = {
  id: string
  value: string
}

export type ReviewSelection = Record<string, true>

function knownInputIds(inputs: readonly ReviewableInput[]) {
  return new Set(inputs.map(input => input.id))
}

export function activeReviewedInputs<T extends ReviewableInput>(
  inputs: readonly T[],
  removedInputIds: ReviewSelection,
): T[] {
  return inputs.filter(input => !removedInputIds[input.id] && input.value.trim().length > 0)
}

export function canRemoveReviewedInput(
  inputs: readonly ReviewableInput[],
  removedInputIds: ReviewSelection,
  inputId: string,
): boolean {
  if (removedInputIds[inputId]) return false
  return activeReviewedInputs(inputs, { ...removedInputIds, [inputId]: true }).length >= MINIMUM_REVIEWED_INPUTS
}

export function reviewedUnderstandingTelemetry(
  inputs: readonly ReviewableInput[],
  correctedInputIds: ReviewSelection,
  removedInputIds: ReviewSelection,
) {
  const knownIds = knownInputIds(inputs)
  return {
    correctionCount: Object.keys(correctedInputIds).filter(id => knownIds.has(id)).length,
    removedObservationCount: Object.keys(removedInputIds).filter(id => knownIds.has(id)).length,
  }
}
