import {
  AI_PATH_CATALOG_VERSION,
  AI_PATH_REPORT_VERSION,
  AI_PATH_SCORING_VERSION,
  AI_PATH_TAXONOMY_VERSION,
  type AssessmentReport,
} from './foundation'
import type {
  AiPathSessionInsert,
  AiPathSessionRow,
  Json,
} from './database.types'
import type {
  AssessmentSessionRecord,
  AssessmentSessionRepository,
  CreateSessionResult,
  NewAssessmentSessionRecord,
} from './session-persistence'

export type GatewayError = { code?: string; message: string }
export type GatewayResult<T> = { data: T | null; error: GatewayError | null }

export type SupabaseSessionGateway = {
  insert(row: AiPathSessionInsert): Promise<GatewayResult<AiPathSessionRow>>
  findOwned(sessionId: string, ownerId: string): Promise<GatewayResult<AiPathSessionRow>>
  findActiveOwned(ownerId: string): Promise<GatewayResult<Pick<AiPathSessionRow, 'id'>>>
  exportOwned(sessionId: string): Promise<GatewayResult<AiPathSessionRow>>
  deleteOwned(sessionId: string): Promise<GatewayResult<boolean>>
}

export class SupabaseSessionRepositoryError extends Error {
  readonly code?: string

  constructor(message: string, code?: string) {
    super(message)
    this.name = 'SupabaseSessionRepositoryError'
    this.code = code
  }
}

function parseStoredReport(value: Json | null): AssessmentReport | null {
  if (value === null) return null
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new SupabaseSessionRepositoryError('Stored assessment report is malformed.')
  }
  if (
    value.reportVersion !== AI_PATH_REPORT_VERSION
    || value.taxonomyVersion !== AI_PATH_TAXONOMY_VERSION
    || value.scoringVersion !== AI_PATH_SCORING_VERSION
    || value.catalogVersion !== AI_PATH_CATALOG_VERSION
  ) {
    throw new SupabaseSessionRepositoryError('Stored assessment report uses unsupported versions.')
  }
  return structuredClone(value) as unknown as AssessmentReport
}

function mapRow(row: AiPathSessionRow): AssessmentSessionRecord {
  if (
    row.taxonomy_version !== AI_PATH_TAXONOMY_VERSION
    || row.scoring_version !== AI_PATH_SCORING_VERSION
    || row.report_version !== AI_PATH_REPORT_VERSION
    || row.catalog_version !== AI_PATH_CATALOG_VERSION
  ) {
    throw new SupabaseSessionRepositoryError('Stored assessment session uses unsupported versions.')
  }
  return {
    id: row.id,
    ownerId: row.owner_id,
    status: row.status,
    mode: row.mode,
    locale: row.locale,
    goal: row.goal,
    targetRole: row.target_role ?? undefined,
    consentVersion: row.consent_version,
    saveTranscript: row.save_transcript,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    report: parseStoredReport(row.report),
  }
}

function throwGatewayError(operation: string, error: GatewayError): never {
  throw new SupabaseSessionRepositoryError(`Supabase session ${operation} failed.`, error.code)
}

export class SupabaseAssessmentSessionRepository implements AssessmentSessionRepository {
  readonly #gateway: SupabaseSessionGateway

  constructor(gateway: SupabaseSessionGateway) {
    this.#gateway = gateway
  }

  async createForOwner(session: NewAssessmentSessionRecord): Promise<CreateSessionResult> {
    if (session.report) {
      throw new SupabaseSessionRepositoryError('A report cannot be attached while creating a session.')
    }
    const result = await this.#gateway.insert({
      id: session.id,
      owner_id: session.ownerId,
      status: session.status,
      mode: session.mode,
      locale: session.locale,
      goal: session.goal,
      target_role: session.targetRole ?? null,
      consent_version: session.consentVersion,
      save_transcript: session.saveTranscript,
    })
    if (!result.error && result.data) return { ok: true, session: mapRow(result.data) }
    if (result.error?.code === '23505') {
      const active = await this.#gateway.findActiveOwned(session.ownerId)
      if (active.error) throwGatewayError('active-session lookup', active.error)
      return {
        ok: false,
        reason: 'active_session_exists',
        sessionId: active.data?.id ?? session.id,
      }
    }
    if (result.error) throwGatewayError('create', result.error)
    throw new SupabaseSessionRepositoryError('Supabase session create returned no row.')
  }

  async findOwnedById(sessionId: string, ownerId: string): Promise<AssessmentSessionRecord | null> {
    const result = await this.#gateway.findOwned(sessionId, ownerId)
    if (result.error) throwGatewayError('read', result.error)
    return result.data ? mapRow(result.data) : null
  }

  async saveReportOwned(
    sessionId: string,
    ownerId: string,
    report: AssessmentReport,
    updatedAt: string,
  ): Promise<AssessmentSessionRecord | null> {
    void sessionId
    void ownerId
    void report
    void updatedAt
    throw new SupabaseSessionRepositoryError(
      'Durable report writes require a trusted server attestation boundary.',
      'trusted_writer_unavailable',
    )
  }

  // Export/delete RPCs derive ownership from auth.uid(); ownerId is deliberately
  // not sent as a trusted database parameter.
  async exportOwnedById(sessionId: string, ownerId: string): Promise<AssessmentSessionRecord | null> {
    void ownerId
    const result = await this.#gateway.exportOwned(sessionId)
    if (result.error) throwGatewayError('export', result.error)
    return result.data ? mapRow(result.data) : null
  }

  async deleteOwnedById(sessionId: string, ownerId: string): Promise<boolean> {
    void ownerId
    const result = await this.#gateway.deleteOwned(sessionId)
    if (result.error) throwGatewayError('delete', result.error)
    return result.data === true
  }
}
