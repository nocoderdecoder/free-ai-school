import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'

import type { AiPathSessionRow, Database } from './database.types'
import type { SupabasePersistenceCapability } from './supabase-persistence'
import {
  SupabaseAssessmentSessionRepository,
  type GatewayError,
  type SupabaseSessionGateway,
} from './supabase-session-repository'

export { SupabaseAssessmentSessionRepository } from './supabase-session-repository'

function normalizedError(error: { code?: string; message: string } | null): GatewayError | null {
  return error ? { code: error.code, message: error.message } : null
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
