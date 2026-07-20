export const AI_PATH_ACCOUNT_PRIVACY_SCHEMA_VERSION = '2026-07-18.v1' as const
export const AI_PATH_ACCOUNT_DELETE_CONFIRMATION = 'DELETE MY AI PATH ACCOUNT' as const

// These are compile-time review gates. Environment variables, credentials, and
// an already-provisioned project cannot activate either account operation.
export const AI_PATH_ACCOUNT_EXPORT_RUNTIME_LATCH = false as const
export const AI_PATH_ACCOUNT_DELETION_RUNTIME_LATCH = false as const

export type AccountPrivacyActivation = Readonly<{
  enabled?: string
  schemaVersion?: string
  credentialScope?: string
  ownershipProofReference?: string
  cascadeDeletionProofReference?: string
  analyticsDeletionReady?: string
  sessionBoundReauthenticationReady?: string
  rollbackReady?: string
}>

export type AccountPrivacyCapability = Readonly<{
  exportAvailable: boolean
  deletionAvailable: boolean
  reason: string
}>

function reviewedHttpsReference(value: string | undefined) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && !url.username && !url.password
  } catch {
    return false
  }
}

/**
 * Fail-closed activation contract for data export and destructive account
 * deletion. Deletion additionally requires proof that every analytics sink can
 * erase the account's server-owned pseudonym before auth.users is removed.
 */
export function resolveAccountPrivacyCapability(
  activation: AccountPrivacyActivation,
): AccountPrivacyCapability {
  const disabled = (reason: string): AccountPrivacyCapability => ({
    exportAvailable: false,
    deletionAvailable: false,
    reason,
  })
  if (activation.enabled !== 'true') return disabled('account privacy operations are not explicitly enabled')
  if (activation.schemaVersion !== AI_PATH_ACCOUNT_PRIVACY_SCHEMA_VERSION) {
    return disabled('the account privacy schema is not attested')
  }
  if (activation.credentialScope !== 'server-only') {
    return disabled('account deletion requires a server-only credential')
  }
  if (!reviewedHttpsReference(activation.ownershipProofReference)) {
    return disabled('a hosted owner-isolation proof is required')
  }
  if (!reviewedHttpsReference(activation.cascadeDeletionProofReference)) {
    return disabled('a hosted cascade-deletion proof is required')
  }
  if (activation.analyticsDeletionReady !== 'true') {
    return disabled('analytics deletion is not attested')
  }
  if (activation.sessionBoundReauthenticationReady !== 'true') {
    return disabled('session-bound account deletion reauthentication is not attested')
  }
  if (activation.rollbackReady !== 'true') return disabled('account privacy rollback is not attested')
  if (!AI_PATH_ACCOUNT_EXPORT_RUNTIME_LATCH || !AI_PATH_ACCOUNT_DELETION_RUNTIME_LATCH) {
    return disabled('the reviewed account privacy runtime latches remain closed')
  }
  return {
    exportAvailable: true,
    deletionAvailable: true,
    reason: 'account privacy operations are ready',
  }
}

export function parseAccountDeleteConfirmation(value: unknown):
  | { ok: true }
  | { ok: false; error: 'invalid_confirmation' } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, error: 'invalid_confirmation' }
  }
  const record = value as Record<string, unknown>
  if (Object.keys(record).length !== 1
    || record.confirmation !== AI_PATH_ACCOUNT_DELETE_CONFIRMATION) {
    return { ok: false, error: 'invalid_confirmation' }
  }
  return { ok: true }
}
