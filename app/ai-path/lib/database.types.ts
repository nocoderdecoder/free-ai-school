export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type AiPathSessionStatus =
  | 'created'
  | 'consented'
  | 'connecting'
  | 'active'
  | 'ending'
  | 'analysis_pending'
  | 'complete'
  | 'failed'
  | 'expired'

export type Database = {
  public: {
    Tables: {
      ai_path_assessment_sessions: {
        Row: {
          id: string
          owner_id: string
          status: AiPathSessionStatus
          mode: 'voice' | 'text'
          locale: string
          goal: string
          target_role: string | null
          consent_version: string
          save_transcript: boolean
          taxonomy_version: string
          scoring_version: string
          report_version: string
          catalog_version: string
          report: Json | null
          report_saved_at: string | null
          report_write_id: string | null
          report_digest: string | null
          retention_expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          status?: AiPathSessionStatus
          mode: 'voice' | 'text'
          locale: string
          goal: string
          target_role?: string | null
          consent_version: string
          save_transcript?: boolean
          taxonomy_version?: string
          scoring_version?: string
          report_version?: string
          catalog_version?: string
          report?: Json | null
          report_saved_at?: string | null
          report_write_id?: string | null
          report_digest?: string | null
          retention_expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          status?: AiPathSessionStatus
          mode?: 'voice' | 'text'
          locale?: string
          goal?: string
          target_role?: string | null
          consent_version?: string
          save_transcript?: boolean
          taxonomy_version?: string
          scoring_version?: string
          report_version?: string
          catalog_version?: string
          report?: Json | null
          report_saved_at?: string | null
          report_write_id?: string | null
          report_digest?: string | null
          retention_expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      create_owned_ai_path_session: {
        Args: {
          p_mode: string
          p_locale: string
          p_goal: string
          p_target_role: string | null
          p_consent_version: string
          p_save_transcript: boolean
        }
        Returns: Json
      }
      export_owned_ai_path_session: {
        Args: { p_session_id: string }
        Returns: Json
      }
      delete_owned_ai_path_session: {
        Args: { p_session_id: string }
        Returns: boolean
      }
      purge_expired_ai_path_sessions: {
        Args: Record<string, never>
        Returns: number
      }
      complete_ai_path_session_trusted: {
        Args: {
          p_session_id: string
          p_owner_id: string
          p_report: Json
          p_report_write_id: string
          p_taxonomy_version: string
          p_scoring_version: string
          p_report_version: string
          p_catalog_version: string
        }
        Returns: Json
      }
    }
    Enums: {
      ai_path_session_status: AiPathSessionStatus
    }
    CompositeTypes: Record<string, never>
  }
}

export type AiPathSessionRow = Database['public']['Tables']['ai_path_assessment_sessions']['Row']
export type AiPathSessionInsert = Database['public']['Tables']['ai_path_assessment_sessions']['Insert']
export type AiPathSessionUpdate = Database['public']['Tables']['ai_path_assessment_sessions']['Update']
