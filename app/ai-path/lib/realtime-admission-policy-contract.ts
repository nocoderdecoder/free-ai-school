import type { RealtimeAdmissionPolicy } from './realtime-admission.ts'

export const AI_PATH_REALTIME_ADMISSION_POLICY_VERSION = '2026-07-17.v1' as const

const policyKeys = [
  'maxGlobalConcurrent',
  'maxUserConcurrent',
  'maxUserDailyCents',
  'maxGlobalDailyCents',
  'maxReservationCents',
  'reservationTtlMs',
] as const

export type RealtimeAdmissionPolicyContract<Version extends string = string> = Readonly<{
  version: Version
  policyId: string
  limits: RealtimeAdmissionPolicy
}>

function hasExactKeys(value: object, expected: readonly string[]) {
  const actual = Object.keys(value).sort()
  const sortedExpected = [...expected].sort()
  return actual.length === sortedExpected.length
    && actual.every((key, index) => key === sortedExpected[index])
}

function integerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum
}

function validateLimits(limits: RealtimeAdmissionPolicy) {
  if (!hasExactKeys(limits, policyKeys)) throw new Error('Realtime admission policy keys are invalid.')
  if (!integerBetween(limits.maxGlobalConcurrent, 1, 100_000)) throw new Error('maxGlobalConcurrent is invalid')
  if (!integerBetween(limits.maxUserConcurrent, 1, limits.maxGlobalConcurrent)) throw new Error('maxUserConcurrent is invalid')
  if (!integerBetween(limits.maxUserDailyCents, 1, 100_000_000)) throw new Error('maxUserDailyCents is invalid')
  if (!integerBetween(limits.maxGlobalDailyCents, limits.maxUserDailyCents, 1_000_000_000)) {
    throw new Error('maxGlobalDailyCents is invalid')
  }
  if (!integerBetween(limits.maxReservationCents, 1, limits.maxUserDailyCents)) {
    throw new Error('maxReservationCents is invalid')
  }
  if (!integerBetween(limits.reservationTtlMs, 30_000, 4 * 60 * 60 * 1000)) {
    throw new Error('reservationTtlMs is invalid')
  }
}

function policyId<Version extends string>(version: Version, limits: RealtimeAdmissionPolicy) {
  return [
    version,
    `gc=${limits.maxGlobalConcurrent}`,
    `uc=${limits.maxUserConcurrent}`,
    `udc=${limits.maxUserDailyCents}`,
    `gdc=${limits.maxGlobalDailyCents}`,
    `rc=${limits.maxReservationCents}`,
    `ttl=${limits.reservationTtlMs}`,
  ].join('|')
}

/**
 * Creates an exact, deeply immutable deployment contract. Callers cannot
 * supply a policy identifier independently from its version and limits.
 */
export function defineRealtimeAdmissionPolicyContract<const Version extends string>(input: {
  version: Version
  limits: RealtimeAdmissionPolicy
}): RealtimeAdmissionPolicyContract<Version> {
  if (!hasExactKeys(input, ['version', 'limits'])) throw new Error('Realtime admission policy contract keys are invalid.')
  const versionMatch = /^(\d{4}-\d{2}-\d{2})\.v[1-9]\d{0,8}$/.exec(input.version)
  const versionDate = versionMatch ? new Date(`${versionMatch[1]}T00:00:00.000Z`) : null
  if (
    !versionMatch
    || !versionDate
    || !Number.isFinite(versionDate.getTime())
    || versionDate.toISOString().slice(0, 10) !== versionMatch[1]
  ) {
    throw new Error('Realtime admission policy version is invalid.')
  }
  validateLimits(input.limits)

  const limits = Object.freeze({ ...input.limits })
  return Object.freeze({
    version: input.version,
    policyId: policyId(input.version, limits),
    limits,
  })
}
