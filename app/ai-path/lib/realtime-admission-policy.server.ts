import 'server-only'

import {
  AI_PATH_REALTIME_ADMISSION_POLICY_VERSION,
  defineRealtimeAdmissionPolicyContract,
} from './realtime-admission-policy-contract.ts'
import type { RealtimeAdmissionPolicy } from './realtime-admission.ts'

// A deployment flag cannot activate a new policy version. Opening this latch
// requires a reviewed code change after disposable-database and spend proof.
export const AI_PATH_REALTIME_ADMISSION_POLICY_ROLLOUT_LATCH = false as const

const privateAlphaLimits = {
  maxGlobalConcurrent: 2,
  maxUserConcurrent: 1,
  maxUserDailyCents: 100,
  maxGlobalDailyCents: 1_000,
  maxReservationCents: 100,
  reservationTtlMs: 120_000,
} as const satisfies RealtimeAdmissionPolicy

/**
 * The only policy accepted by the dormant durable service factory. These are
 * conservative private-alpha ceilings, not permission to spend or go live.
 */
export const AI_PATH_REALTIME_ADMISSION_POLICY = defineRealtimeAdmissionPolicyContract({
  version: AI_PATH_REALTIME_ADMISSION_POLICY_VERSION,
  limits: privateAlphaLimits,
})
