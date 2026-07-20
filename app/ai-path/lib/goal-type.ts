export const AI_PATH_GOAL_TYPES = [
  'workflows',
  'builder',
  'career',
  'leader',
  'foundations',
  'unsure',
] as const

export type AiPathGoalType = (typeof AI_PATH_GOAL_TYPES)[number]

const goalTypeSet = new Set<string>(AI_PATH_GOAL_TYPES)

export function isAiPathGoalType(value: unknown): value is AiPathGoalType {
  return typeof value === 'string' && goalTypeSet.has(value)
}
