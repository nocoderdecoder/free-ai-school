import type {
  CapabilityIntake,
  CapabilityPrescription,
  UseCaseBlueprint,
  UseCaseIntake,
} from './diagnostic.ts'
import { AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION } from './diagnostic-storage-consent.ts'

export const AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_SCHEMA_VERSION = '20260718010000' as const
export const AI_PATH_CONSUMER_PRIVACY_NOTICE_VERSION = AI_PATH_DIAGNOSTIC_STORAGE_NOTICE_VERSION

// This code-owned latch stays closed until a hosted, disposable Supabase proof,
// retention job, key-rotation runbook, and rollback review are approved.
export const AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_LATCH = false as const

export type ConsumerDiagnosticPersistenceInput = Readonly<{
  ownerId: string
  idempotencyKey: string
  intake: UseCaseIntake | CapabilityIntake
  result: UseCaseBlueprint | CapabilityPrescription
  privacyNoticeVersion: typeof AI_PATH_CONSUMER_PRIVACY_NOTICE_VERSION
  storageConsent: true
}>

export type ConsumerDiagnosticPersistenceReceipt = Readonly<{
  sessionId: string
  intakeDigest: string
  resultDigest: string
  retentionExpiresAt: string
  replayed: boolean
}>

export type ConsumerDiagnosticPersistenceActivation = Readonly<{
  enabled?: string
  schemaVersion?: string
  credentialScope?: string
  hostedProof?: string
  retentionReady?: string
  rollbackReady?: string
}>

export type ConsumerDiagnosticPersistenceRpcClient = {
  rpc(
    name: 'persist_ai_path_consumer_diagnostic_trusted',
    args: {
      p_owner_id: string
      p_idempotency_key: string
      p_intake: UseCaseIntake | CapabilityIntake
      p_result: UseCaseBlueprint | CapabilityPrescription
      p_privacy_notice_version: string
      p_storage_consent: boolean
    },
  ): PromiseLike<{ data: unknown; error: unknown }>
}

export class ConsumerDiagnosticPersistenceError extends Error {
  readonly code: 'disabled' | 'rpc_failed' | 'malformed_response'

  constructor(code: 'disabled' | 'rpc_failed' | 'malformed_response') {
    super(code)
    this.name = 'ConsumerDiagnosticPersistenceError'
    this.code = code
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function isSha256(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)
}

function parseReceipt(value: unknown): ConsumerDiagnosticPersistenceReceipt | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const receipt = value as Record<string, unknown>
  if (Object.keys(receipt).sort().join(',') !== 'intakeDigest,replayed,resultDigest,retentionExpiresAt,sessionId') {
    return null
  }
  if (!isUuid(receipt.sessionId)
    || !isSha256(receipt.intakeDigest)
    || !isSha256(receipt.resultDigest)
    || typeof receipt.retentionExpiresAt !== 'string'
    || !Number.isFinite(Date.parse(receipt.retentionExpiresAt))
    || typeof receipt.replayed !== 'boolean') return null
  return {
    sessionId: receipt.sessionId,
    intakeDigest: receipt.intakeDigest,
    resultDigest: receipt.resultDigest,
    retentionExpiresAt: receipt.retentionExpiresAt,
    replayed: receipt.replayed,
  }
}

/** Narrow transport for the one service-role-only immutable completion RPC. */
export class SupabaseConsumerDiagnosticPersistence {
  private readonly client: ConsumerDiagnosticPersistenceRpcClient

  constructor(client: ConsumerDiagnosticPersistenceRpcClient) {
    this.client = client
  }

  async persist(input: ConsumerDiagnosticPersistenceInput): Promise<ConsumerDiagnosticPersistenceReceipt> {
    let response: { data: unknown; error: unknown }
    try {
      response = await this.client.rpc('persist_ai_path_consumer_diagnostic_trusted', {
        p_owner_id: input.ownerId,
        p_idempotency_key: input.idempotencyKey,
        p_intake: input.intake,
        p_result: input.result,
        p_privacy_notice_version: input.privacyNoticeVersion,
        p_storage_consent: input.storageConsent,
      })
    } catch {
      throw new ConsumerDiagnosticPersistenceError('rpc_failed')
    }
    if (response.error) throw new ConsumerDiagnosticPersistenceError('rpc_failed')
    const receipt = parseReceipt(response.data)
    if (!receipt) throw new ConsumerDiagnosticPersistenceError('malformed_response')
    return receipt
  }
}

export function createSupabaseConsumerDiagnosticPersistence(
  client: ConsumerDiagnosticPersistenceRpcClient,
  activation: ConsumerDiagnosticPersistenceActivation,
) {
  if (!AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_LATCH
    || activation.enabled !== 'true'
    || activation.schemaVersion !== AI_PATH_CONSUMER_DIAGNOSTIC_PERSISTENCE_SCHEMA_VERSION
    || activation.credentialScope !== 'verified-owner+service-role'
    || activation.hostedProof !== 'passed'
    || activation.retentionReady !== 'true'
    || activation.rollbackReady !== 'true') {
    throw new ConsumerDiagnosticPersistenceError('disabled')
  }
  return new SupabaseConsumerDiagnosticPersistence(client)
}
