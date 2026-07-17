import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { AiPathSessionRow, Database } from './database.types'
import type { Json } from './database.types'
import type { SupabasePersistenceCapability } from './supabase-persistence'
import {
  SupabaseAssessmentSessionRepository,
  SupabaseTrustedReportWriter,
  type GatewayError,
  type SupabaseSessionGateway,
  type SupabaseTrustedReportGateway,
  type TrustedReportCompletionPayload,
} from './supabase-session-repository'

export {
  SupabaseAssessmentSessionRepository,
  SupabaseTrustedReportWriter,
} from './supabase-session-repository'

export const AI_PATH_TRUSTED_REPORT_WRITER_MIGRATION_VERSION = '20260717020000'

// Enabling this requires migration/RPC integration tests against a disposable
// Supabase project plus an operational key-rotation and rollback review.
export const AI_PATH_TRUSTED_REPORT_WRITER_LATCH = false as const

function normalizedError(error: { code?: string; message: string } | null): GatewayError | null {
  return error ? { code: error.code, message: error.message } : null
}

function isRecord(value: Json | undefined): value is { [key: string]: Json | undefined } {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseTrustedCompletion(value: Json | null): TrustedReportCompletionPayload | null {
  if (!isRecord(value ?? undefined)) return null
  const record = value as { [key: string]: Json | undefined }
  const session = record.session
  const replayed = record.replayed
  const reportDigest = record.reportDigest
  if (!isRecord(session) || typeof replayed !== 'boolean' || typeof reportDigest !== 'string') return null
  return {
    session: session as unknown as AiPathSessionRow,
    replayed,
    reportDigest,
  }
}

/** Creates the authenticated PostgREST transport used by the durable repository. */
export function createSupabaseSessionGateway(
  client: SupabaseClient<Database>,
): SupabaseSessionGateway {
  return {
    async insert(row) {
      const { data, error } = await client.rpc('create_owned_ai_path_session', {
        p_mode: row.mode,
        p_locale: row.locale,
        p_goal: row.goal,
        p_target_role: row.target_role ?? null,
        p_consent_version: row.consent_version,
        p_save_transcript: row.save_transcript ?? false,
      })
      return {
        data: data && typeof data === 'object' && !Array.isArray(data)
          ? data as unknown as AiPathSessionRow
          : null,
        error: normalizedError(error),
      }
    },
    async findOwned(sessionId, ownerId) {
      const { data, error } = await client
        .from('ai_path_assessment_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('owner_id', ownerId)
        .maybeSingle()
      return { data, error: normalizedError(error) }
    },
    async findActiveOwned(ownerId) {
      const { data, error } = await client
        .from('ai_path_assessment_sessions')
        .select('id')
        .eq('owner_id', ownerId)
        .in('status', ['created', 'consented', 'connecting', 'active', 'ending', 'analysis_pending'])
        .limit(1)
        .maybeSingle()
      return { data, error: normalizedError(error) }
    },
    async exportOwned(sessionId) {
      const { data, error } = await client.rpc('export_owned_ai_path_session', {
        p_session_id: sessionId,
      })
      return {
        data: data && typeof data === 'object' && !Array.isArray(data)
          ? data as unknown as AiPathSessionRow
          : null,
        error: normalizedError(error),
      }
    },
    async deleteOwned(sessionId) {
      const { data, error } = await client.rpc('delete_owned_ai_path_session', {
        p_session_id: sessionId,
      })
      return { data, error: normalizedError(error) }
    },
  }
}

export function createSupabaseAssessmentSessionRepository(
  client: SupabaseClient<Database>,
  capability: SupabasePersistenceCapability,
) {
  if (!capability.available || !capability.productionReady || capability.mode !== 'supabase') {
    throw new Error(`Supabase assessment persistence is unavailable: ${capability.reason}`)
  }
  return new SupabaseAssessmentSessionRepository(createSupabaseSessionGateway(client))
}

/**
 * Transport for the service-role-only RPC. This accepts an already-created
 * client so this module never reads, logs, or distributes a service-role key.
 * Passing an authenticated user client is harmless: database EXECUTE grants and
 * the JWT-role assertion both reject it.
 */
export function createSupabaseTrustedReportGateway(
  serviceRoleClient: SupabaseClient<Database>,
): SupabaseTrustedReportGateway {
  return {
    async complete(input) {
      const { data, error } = await serviceRoleClient.rpc('complete_ai_path_session_trusted', {
        p_session_id: input.sessionId,
        p_owner_id: input.ownerId,
        p_report: input.report,
        p_report_write_id: input.reportWriteId,
        p_taxonomy_version: input.taxonomyVersion,
        p_scoring_version: input.scoringVersion,
        p_report_version: input.reportVersion,
        p_catalog_version: input.catalogVersion,
      })
      return {
        data: parseTrustedCompletion(data),
        error: normalizedError(error),
      }
    },
  }
}

export type TrustedReportWriterActivation = {
  enabled?: string
  schemaVersion?: string
}

export function createSupabaseTrustedReportWriter(
  serviceRoleClient: SupabaseClient<Database>,
  activation: TrustedReportWriterActivation,
) {
  if (
    !AI_PATH_TRUSTED_REPORT_WRITER_LATCH
    || activation.enabled !== 'true'
    || activation.schemaVersion !== AI_PATH_TRUSTED_REPORT_WRITER_MIGRATION_VERSION
  ) {
    throw new Error('Trusted durable report writes are disabled by the reviewed code-level latch.')
  }
  return new SupabaseTrustedReportWriter(createSupabaseTrustedReportGateway(serviceRoleClient))
}
