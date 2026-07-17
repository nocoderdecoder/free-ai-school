import {
  AI_PATH_CATALOG_VERSION,
  AI_PATH_REPORT_VERSION,
  AI_PATH_SCORING_VERSION,
  AI_PATH_TAXONOMY_VERSION,
  type AssessmentReport,
} from './foundation.ts'
import type {
  AiPathSessionInsert,
  AiPathSessionRow,
  Json,
} from './database.types'
import type {
  AssessmentPrincipal,
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

export type TrustedReportCompletionPayload = {
  session: AiPathSessionRow
  replayed: boolean
  reportDigest: string
}

export type TrustedReportCompletionArgs = {
  sessionId: string
  ownerId: string
  report: Json
  reportWriteId: string
  taxonomyVersion: string
  scoringVersion: string
  reportVersion: string
  catalogVersion: string
}

export type SupabaseTrustedReportGateway = {
  complete(
    input: TrustedReportCompletionArgs,
  ): Promise<GatewayResult<TrustedReportCompletionPayload>>
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

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const sha256Pattern = /^[0-9a-f]{64}$/

function serializeTrustedReport(report: AssessmentReport): Json {
  if (
    report.reportVersion !== AI_PATH_REPORT_VERSION
    || report.taxonomyVersion !== AI_PATH_TAXONOMY_VERSION
    || report.scoringVersion !== AI_PATH_SCORING_VERSION
    || report.catalogVersion !== AI_PATH_CATALOG_VERSION
    || typeof report.goal !== 'string'
    || report.goal.trim().length < 20
    || !Array.isArray(report.results)
    || !Array.isArray(report.strengths)
    || !Array.isArray(report.growthAreas)
    || !Array.isArray(report.recommendations)
  ) {
    throw new SupabaseSessionRepositoryError('The server-recomputed report is malformed or unpinned.')
  }

  let encoded: string
  try {
    encoded = JSON.stringify(report)
  } catch {
    throw new SupabaseSessionRepositoryError('The server-recomputed report is not JSON serializable.')
  }
  if (new TextEncoder().encode(encoded).byteLength > 1_048_576) {
    throw new SupabaseSessionRepositoryError('The server-recomputed report exceeds the durable size limit.')
  }
  const parsed = JSON.parse(encoded) as Json
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new SupabaseSessionRepositoryError('The server-recomputed report must be a JSON object.')
  }
  return parsed
}

export type CompleteServerRecomputedReportInput = {
  sessionId: string
  principal: AssessmentPrincipal
  report: AssessmentReport
  /** Stable server-generated UUID reused only when retrying the exact same write. */
  reportWriteId: string
}

export type TrustedReportCompletionResult = {
  session: AssessmentSessionRecord
  replayed: boolean
  reportDigest: string
}

/**
 * Narrow adapter for the service-role-only completion RPC.
 *
 * This is deliberately separate from AssessmentSessionRepository.saveReportOwned:
 * ordinary authenticated repositories must remain incapable of report writes.
 * Callers must first verify the Supabase user and recompute the report on the
 * server from reviewed inputs; no client-provided report is accepted here.
 */
export class SupabaseTrustedReportWriter {
  readonly #gateway: SupabaseTrustedReportGateway

  constructor(gateway: SupabaseTrustedReportGateway) {
    this.#gateway = gateway
  }

  async completeServerRecomputedReport(
    input: CompleteServerRecomputedReportInput,
  ): Promise<TrustedReportCompletionResult> {
    if (input.principal.source !== 'supabase' || !uuidPattern.test(input.principal.userId)) {
      throw new SupabaseSessionRepositoryError('A verified Supabase principal is required.')
    }
    if (!uuidPattern.test(input.sessionId) || !uuidPattern.test(input.reportWriteId)) {
      throw new SupabaseSessionRepositoryError('Trusted report identifiers must be UUIDs.')
    }

    const result = await this.#gateway.complete({
      sessionId: input.sessionId,
      ownerId: input.principal.userId,
      report: serializeTrustedReport(input.report),
      reportWriteId: input.reportWriteId,
      taxonomyVersion: AI_PATH_TAXONOMY_VERSION,
      scoringVersion: AI_PATH_SCORING_VERSION,
      reportVersion: AI_PATH_REPORT_VERSION,
      catalogVersion: AI_PATH_CATALOG_VERSION,
    })
    if (result.error) throwGatewayError('trusted report completion', result.error)
    if (!result.data) {
      throw new SupabaseSessionRepositoryError('Trusted report completion returned no result.')
    }

    const { session, replayed, reportDigest } = result.data
    if (
      session.id !== input.sessionId
      || session.owner_id !== input.principal.userId
      || session.status !== 'complete'
      || session.report_write_id !== input.reportWriteId
      || session.report_digest !== reportDigest
      || !sha256Pattern.test(reportDigest)
    ) {
      throw new SupabaseSessionRepositoryError('Trusted report completion returned an invalid binding.')
    }
    return { session: mapRow(session), replayed, reportDigest }
  }
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
