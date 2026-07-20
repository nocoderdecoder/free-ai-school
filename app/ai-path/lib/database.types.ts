import type { AiPathGoalType } from './goal-type.ts'

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

export type AiPathLearningPlanStatus = 'active' | 'completed' | 'archived'
export type AiPathPlanSnapshotReason = 'initial' | 'adaptation' | 'reassessment'
export type AiPathPlanTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped'
export type AiPathPlanAdaptationStatus = 'proposed' | 'approved' | 'rejected' | 'superseded'

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
          goal_type: AiPathGoalType
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
          analysis_attempt_id: string | null
          analysis_started_at: string | null
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
          goal_type: AiPathGoalType
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
          analysis_attempt_id?: string | null
          analysis_started_at?: string | null
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
          goal_type?: AiPathGoalType
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
          analysis_attempt_id?: string | null
          analysis_started_at?: string | null
          retention_expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_path_learning_plans: {
        Row: {
          id: string
          owner_id: string
          source_assessment_session_id: string
          goal_type: AiPathGoalType
          plan_version: string
          status: AiPathLearningPlanStatus
          revision: number
          current_snapshot_version: number
          weekly_minutes: number
          retention_expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          source_assessment_session_id: string
          goal_type: AiPathGoalType
          plan_version?: string
          status?: AiPathLearningPlanStatus
          revision?: number
          current_snapshot_version?: number
          weekly_minutes: number
          retention_expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          source_assessment_session_id?: string
          goal_type?: AiPathGoalType
          plan_version?: string
          status?: AiPathLearningPlanStatus
          revision?: number
          current_snapshot_version?: number
          weekly_minutes?: number
          retention_expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_path_learning_plan_snapshots: {
        Row: {
          id: string
          plan_id: string
          version: number
          reason: AiPathPlanSnapshotReason
          source_assessment_session_id: string
          title: string
          proof: string
          focus_now: string
          not_yet: string
          tasks: Json
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          version: number
          reason: AiPathPlanSnapshotReason
          source_assessment_session_id: string
          title: string
          proof: string
          focus_now: string
          not_yet: string
          tasks: Json
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          version?: number
          reason?: AiPathPlanSnapshotReason
          source_assessment_session_id?: string
          title?: string
          proof?: string
          focus_now?: string
          not_yet?: string
          tasks?: Json
          created_at?: string
        }
        Relationships: []
      }
      ai_path_learning_plan_task_progress: {
        Row: {
          plan_id: string
          snapshot_version: number
          task_id: string
          status: AiPathPlanTaskStatus
          updated_at: string
          completed_at: string | null
        }
        Insert: {
          plan_id: string
          snapshot_version: number
          task_id: string
          status?: AiPathPlanTaskStatus
          updated_at?: string
          completed_at?: string | null
        }
        Update: {
          plan_id?: string
          snapshot_version?: number
          task_id?: string
          status?: AiPathPlanTaskStatus
          updated_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      ai_path_learning_plan_check_ins: {
        Row: { id: string; plan_id: string; week_number: number; check_in_text: string; created_at: string }
        Insert: { id?: string; plan_id: string; week_number: number; check_in_text: string; created_at?: string }
        Update: { id?: string; plan_id?: string; week_number?: number; check_in_text?: string; created_at?: string }
        Relationships: []
      }
      ai_path_learning_plan_time_budget_changes: {
        Row: {
          id: string
          plan_id: string
          from_minutes: number
          to_minutes: number
          reason: string
          source: 'user' | 'adaptation'
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          from_minutes: number
          to_minutes: number
          reason: string
          source: 'user' | 'adaptation'
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          from_minutes?: number
          to_minutes?: number
          reason?: string
          source?: 'user' | 'adaptation'
          created_at?: string
        }
        Relationships: []
      }
      ai_path_learning_plan_adaptations: {
        Row: {
          id: string
          plan_id: string
          proposal_text: string
          operations: Json
          status: AiPathPlanAdaptationStatus
          base_snapshot_version: number
          created_at: string
          decided_at: string | null
        }
        Insert: {
          id?: string
          plan_id: string
          proposal_text: string
          operations: Json
          status?: AiPathPlanAdaptationStatus
          base_snapshot_version: number
          created_at?: string
          decided_at?: string | null
        }
        Update: {
          id?: string
          plan_id?: string
          proposal_text?: string
          operations?: Json
          status?: AiPathPlanAdaptationStatus
          base_snapshot_version?: number
          created_at?: string
          decided_at?: string | null
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
          p_goal_type: AiPathGoalType
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
        Args: { p_limit: number }
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
      begin_ai_path_analysis_trusted: {
        Args: {
          p_session_id: string
          p_owner_id: string
          p_proposed_attempt_id: string
        }
        Returns: Json
      }
      create_ai_path_learning_plan: {
        Args: {
          p_owner_id: string
          p_source_assessment_session_id: string
          p_goal_type: AiPathGoalType
          p_weekly_minutes: number
          p_title: string
          p_proof: string
          p_focus_now: string
          p_not_yet: string
          p_tasks: Json
        }
        Returns: string
      }
      set_owned_ai_path_plan_task_progress: {
        Args: { p_plan_id: string; p_task_id: string; p_next_status: AiPathPlanTaskStatus; p_expected_revision: number }
        Returns: Json
      }
      adjust_owned_ai_path_plan_time_budget: {
        Args: { p_plan_id: string; p_weekly_minutes: number; p_reason: string; p_expected_revision: number }
        Returns: Json
      }
      add_owned_ai_path_plan_check_in: {
        Args: { p_plan_id: string; p_week_number: number; p_check_in_text: string; p_expected_revision: number }
        Returns: Json
      }
      respond_to_owned_ai_path_plan_adaptation: {
        Args: { p_plan_id: string; p_adaptation_id: string; p_decision: string; p_expected_revision: number }
        Returns: Json
      }
      export_owned_ai_path_learning_plan: {
        Args: { p_plan_id: string }
        Returns: Json
      }
      delete_owned_ai_path_learning_plan: {
        Args: { p_plan_id: string }
        Returns: boolean
      }
      purge_expired_ai_path_learning_plans: {
        Args: { p_limit: number }
        Returns: number
      }
      issue_ai_path_realtime_admission_intent: {
        Args: {
          p_policy_id: string
          p_assessment_session_id: string
        }
        Returns: Json
      }
      reserve_ai_path_realtime_admission: {
        Args: {
          p_policy_id: string
          p_intent_id: string
          p_idempotency_key: string
          p_estimated_cents: number
        }
        Returns: Json
      }
      finalize_ai_path_realtime_admission: {
        Args: {
          p_policy_id: string
          p_intent_id: string
          p_reservation_id: string
          p_actual_cents: number
        }
        Returns: Json
      }
      cancel_ai_path_realtime_admission: {
        Args: {
          p_policy_id: string
          p_intent_id: string
          p_reservation_id: string
        }
        Returns: Json
      }
      maintain_ai_path_realtime_admission: {
        Args: {
          p_policy_id: string
          p_expire_limit: number
          p_purge_limit: number
          p_intent_cleanup_limit: number
          p_mapping_gc_limit: number
        }
        Returns: Json
      }
    }
    Enums: {
      ai_path_session_status: AiPathSessionStatus
      ai_path_learning_plan_status: AiPathLearningPlanStatus
      ai_path_plan_snapshot_reason: AiPathPlanSnapshotReason
      ai_path_plan_task_status: AiPathPlanTaskStatus
      ai_path_plan_adaptation_status: AiPathPlanAdaptationStatus
    }
    CompositeTypes: Record<string, never>
  }
}

export type AiPathSessionRow = Database['public']['Tables']['ai_path_assessment_sessions']['Row']
export type AiPathSessionInsert = Database['public']['Tables']['ai_path_assessment_sessions']['Insert']
export type AiPathSessionUpdate = Database['public']['Tables']['ai_path_assessment_sessions']['Update']
