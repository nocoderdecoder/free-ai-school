import {
  AI_PATH_DIAGNOSTIC_VERSION,
  type CapabilityIntake,
  type UseCaseIntake,
} from './diagnostic.ts'

export const AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION = '2026-07-18.consumer.v1' as const
export const AI_PATH_DIAGNOSTIC_SUBMISSION_MAXIMUM_BYTES = 34_816

export type DiagnosticStorageConsent = Readonly<{
  acknowledged: boolean
  version: typeof AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION
}>

export type DiagnosticSubmission = Readonly<{
  intake: UseCaseIntake | CapabilityIntake
  storageConsent: DiagnosticStorageConsent
  idempotencyKey: string | null
}>

type SubmissionResult =
  | { ok: true; value: DiagnosticSubmission }
  | { ok: false; error: 'invalid_diagnostic'; details: readonly string[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function exactKeys(value: Record<string, unknown>, expected: readonly string[]) {
  const actual = Object.keys(value).sort()
  const wanted = [...expected].sort()
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index])
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * Parses only the storage envelope. Strict diagnostic validation remains the
 * responsibility of parseDiagnosticIntake, so this contract cannot weaken it.
 */
export function parseDiagnosticSubmissionEnvelope(value: unknown): SubmissionResult {
  if (!isRecord(value)
    || !exactKeys(value, ['intake', 'storageConsent', 'idempotencyKey'])
    || !isRecord(value.intake)
    || !isRecord(value.storageConsent)
    || !exactKeys(value.storageConsent, ['acknowledged', 'version'])
    || value.storageConsent.version !== AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION
    || typeof value.storageConsent.acknowledged !== 'boolean') {
    return { ok: false, error: 'invalid_diagnostic', details: ['The diagnostic submission envelope is invalid.'] }
  }
  if (value.intake.version !== AI_PATH_DIAGNOSTIC_VERSION) {
    return { ok: false, error: 'invalid_diagnostic', details: ['Unsupported diagnostic version.'] }
  }
  if (value.storageConsent.acknowledged) {
    if (!isUuid(value.idempotencyKey)) {
      return { ok: false, error: 'invalid_diagnostic', details: ['A valid storage completion key is required.'] }
    }
  } else if (value.idempotencyKey !== null) {
    return { ok: false, error: 'invalid_diagnostic', details: ['An unsaved diagnostic must not include a storage completion key.'] }
  }
  return {
    ok: true,
    value: {
      intake: value.intake as UseCaseIntake | CapabilityIntake,
      storageConsent: {
        acknowledged: value.storageConsent.acknowledged,
        version: AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION,
      },
      idempotencyKey: value.idempotencyKey as string | null,
    },
  }
}
