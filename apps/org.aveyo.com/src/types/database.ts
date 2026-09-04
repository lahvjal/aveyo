export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          preferred_name: string | null
          job_title: string
          job_description: string | null
          bio: string | null
          start_date: string
          birthday: string | null
          profile_photo_url: string | null
          phone: string | null
          location: string | null
          department_id: string | null
          manager_id: string | null
          social_links: Json | null
          is_admin: boolean
          is_manager: boolean
          is_executive: boolean
          is_super_admin: boolean
          is_process_editor: boolean
          onboarding_completed: boolean
          has_logged_in: boolean
          last_sign_in_at: string | null
          employment_status: 'active' | 'terminated'
          terminated_at: string | null
          termination_effective_at: string | null
          termination_reason: string | null
          terminated_by: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name: string
          preferred_name?: string | null
          job_title: string
          job_description?: string | null
          bio?: string | null
          start_date: string
          birthday?: string | null
          profile_photo_url?: string | null
          phone?: string | null
          location?: string | null
          department_id?: string | null
          manager_id?: string | null
          social_links?: Json | null
          is_admin?: boolean
          is_manager?: boolean
          is_executive?: boolean
          is_super_admin?: boolean
          is_process_editor?: boolean
          onboarding_completed?: boolean
          has_logged_in?: boolean
          last_sign_in_at?: string | null
          employment_status?: 'active' | 'terminated'
          terminated_at?: string | null
          termination_effective_at?: string | null
          termination_reason?: string | null
          terminated_by?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          preferred_name?: string | null
          job_title?: string
          job_description?: string | null
          bio?: string | null
          start_date?: string
          birthday?: string | null
          profile_photo_url?: string | null
          phone?: string | null
          location?: string | null
          department_id?: string | null
          manager_id?: string | null
          social_links?: Json | null
          is_admin?: boolean
          is_manager?: boolean
          is_executive?: boolean
          is_super_admin?: boolean
          is_process_editor?: boolean
          onboarding_completed?: boolean
          has_logged_in?: boolean
          last_sign_in_at?: string | null
          employment_status?: 'active' | 'terminated'
          terminated_at?: string | null
          termination_effective_at?: string | null
          termination_reason?: string | null
          terminated_by?: string | null
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'profiles_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'profiles_manager_id_fkey'
            columns: ['manager_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      department_sop_documents: {
        Row: {
          id: string
          department_id: string
          folder_id: string | null
          title: string
          description: string
          url: string
          sort_order: number
          created_by: string
          updated_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          department_id: string
          folder_id?: string | null
          title: string
          description?: string
          url: string
          sort_order?: number
          created_by: string
          updated_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          department_id?: string
          folder_id?: string | null
          title?: string
          description?: string
          url?: string
          sort_order?: number
          created_by?: string
          updated_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'department_sop_documents_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'department_sop_documents_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'department_sop_folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'department_sop_documents_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'department_sop_documents_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      department_sop_folders: {
        Row: {
          id: string
          department_id: string
          name: string
          sort_order: number
          created_by: string
          updated_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          department_id: string
          name: string
          sort_order?: number
          created_by: string
          updated_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          department_id?: string
          name?: string
          sort_order?: number
          created_by?: string
          updated_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'department_sop_folders_department_id_fkey'
            columns: ['department_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'department_sop_folders_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'department_sop_folders_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      departments: {
        Row: {
          id: string
          name: string
          slug: string | null
          color: string
          description: string | null
          parent_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug?: string | null
          color: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string | null
          color?: string
          description?: string | null
          parent_id?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'departments_parent_id_fkey'
            columns: ['parent_id']
            isOneToOne: false
            referencedRelation: 'departments'
            referencedColumns: ['id']
          },
        ]
      }
      org_chart_positions: {
        Row: {
          id: string
          profile_id: string
          x_position: number
          y_position: number
          updated_at: string
          updated_by: string
        }
        Insert: {
          id?: string
          profile_id: string
          x_position: number
          y_position: number
          updated_at?: string
          updated_by: string
        }
        Update: {
          id?: string
          profile_id?: string
          x_position?: number
          y_position?: number
          updated_at?: string
          updated_by?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_chart_positions_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: true
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'org_chart_positions_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      org_chart_flash_quiz_scores: {
        Row: {
          id: string
          profile_id: string
          correct_count: number
          total_questions: number
          average_response_ms: number
          accuracy_pct: number
          created_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          correct_count: number
          total_questions: number
          average_response_ms: number
          accuracy_pct: number
          created_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          correct_count?: number
          total_questions?: number
          average_response_ms?: number
          accuracy_pct?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'org_chart_flash_quiz_scores_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      share_links: {
        Row: {
          id: string
          slug: string
          root_profile_id: string
          include_contact_info: boolean
          expires_at: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          root_profile_id: string
          include_contact_info?: boolean
          expires_at?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          root_profile_id?: string
          include_contact_info?: boolean
          expires_at?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'share_links_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'share_links_root_profile_id_fkey'
            columns: ['root_profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          action: string
          profile_id: string
          changed_by: string
          changes: Json
          created_at: string
        }
        Insert: {
          id?: string
          action: string
          profile_id: string
          changed_by: string
          changes: Json
          created_at?: string
        }
        Update: {
          id?: string
          action?: string
          profile_id?: string
          changed_by?: string
          changes?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'audit_logs_changed_by_fkey'
            columns: ['changed_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'audit_logs_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      field_safety_folders: {
        Row: {
          id: string
          name: string
          drive_url: string
          drive_item_id: string | null
          parent_folder_id: string | null
          sort_order: number
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          drive_url: string
          drive_item_id?: string | null
          parent_folder_id?: string | null
          sort_order?: number
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          drive_url?: string
          drive_item_id?: string | null
          parent_folder_id?: string | null
          sort_order?: number
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'field_safety_folders_parent_folder_id_fkey'
            columns: ['parent_folder_id']
            isOneToOne: false
            referencedRelation: 'field_safety_folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'field_safety_folders_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      field_safety_documents: {
        Row: {
          id: string
          folder_id: string | null
          drive_item_id: string | null
          title: string
          description: string
          url: string
          sort_order: number
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          folder_id?: string | null
          drive_item_id?: string | null
          title: string
          description?: string
          url: string
          sort_order?: number
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          folder_id?: string | null
          drive_item_id?: string | null
          title?: string
          description?: string
          url?: string
          sort_order?: number
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'field_safety_documents_folder_id_fkey'
            columns: ['folder_id']
            isOneToOne: false
            referencedRelation: 'field_safety_folders'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'field_safety_documents_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      operations_tab_links: {
        Row: {
          tab_key: 'processes' | 'sops' | 'field_safety_protocol'
          drive_url: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          tab_key: 'processes' | 'sops' | 'field_safety_protocol'
          drive_url?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          tab_key?: 'processes' | 'sops' | 'field_safety_protocol'
          drive_url?: string | null
          updated_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'operations_tab_links_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      organization_settings: {
        Row: {
          id: string
          logo_url: string | null
          updated_by: string
          updated_at: string
          created_at: string
        }
        Insert: {
          id?: string
          logo_url?: string | null
          updated_by: string
          updated_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          logo_url?: string | null
          updated_by?: string
          updated_at?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'organization_settings_updated_by_fkey'
            columns: ['updated_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      processes: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'processes_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      process_nodes: {
        Row: {
          id: string
          process_id: string
          node_type: string
          label: string
          description: string | null
          document_links: string[]
          x_position: number
          y_position: number
          tagged_profile_ids: string[]
          tagged_department_ids: string[]
          created_at: string
        }
        Insert: {
          id?: string
          process_id: string
          node_type?: string
          label?: string
          description?: string | null
          document_links?: string[]
          x_position?: number
          y_position?: number
          tagged_profile_ids?: string[]
          tagged_department_ids?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          process_id?: string
          node_type?: string
          label?: string
          description?: string | null
          document_links?: string[]
          x_position?: number
          y_position?: number
          tagged_profile_ids?: string[]
          tagged_department_ids?: string[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'process_nodes_process_id_fkey'
            columns: ['process_id']
            isOneToOne: false
            referencedRelation: 'processes'
            referencedColumns: ['id']
          },
        ]
      }
      process_edges: {
        Row: {
          id: string
          process_id: string
          source_node_id: string
          target_node_id: string
          label: string | null
          waypoints: Json | null
          source_side: string | null
          target_side: string | null
          created_at: string
        }
        Insert: {
          id?: string
          process_id: string
          source_node_id: string
          target_node_id: string
          label?: string | null
          waypoints?: Json | null
          source_side?: string | null
          target_side?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          process_id?: string
          source_node_id?: string
          target_node_id?: string
          label?: string | null
          waypoints?: Json | null
          source_side?: string | null
          target_side?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'process_edges_process_id_fkey'
            columns: ['process_id']
            isOneToOne: false
            referencedRelation: 'processes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'process_edges_source_node_id_fkey'
            columns: ['source_node_id']
            isOneToOne: false
            referencedRelation: 'process_nodes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'process_edges_target_node_id_fkey'
            columns: ['target_node_id']
            isOneToOne: false
            referencedRelation: 'process_nodes'
            referencedColumns: ['id']
          },
        ]
      }
      process_share_links: {
        Row: {
          id: string
          slug: string
          process_id: string
          created_by: string
          expires_at: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          slug: string
          process_id: string
          created_by: string
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          slug?: string
          process_id?: string
          created_by?: string
          expires_at?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'process_share_links_created_by_fkey'
            columns: ['created_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'process_share_links_process_id_fkey'
            columns: ['process_id']
            isOneToOne: false
            referencedRelation: 'processes'
            referencedColumns: ['id']
          },
        ]
      }
      employee_survey_responses: {
        Row: {
          id: string
          quarter: string
          tenure: '3_plus_years' | '2_years' | '1_year' | '6_months' | 'less_than_6_months'
          enps_score: number
          tools_freedom: number
          lives_values: number
          safe_seen: number
          comment: string | null
          created_on: string
        }
        Insert: {
          id?: string
          quarter: string
          tenure: '3_plus_years' | '2_years' | '1_year' | '6_months' | 'less_than_6_months'
          enps_score: number
          tools_freedom: number
          lives_values: number
          safe_seen: number
          comment?: string | null
          created_on?: string
        }
        Update: {
          id?: string
          quarter?: string
          tenure?: '3_plus_years' | '2_years' | '1_year' | '6_months' | 'less_than_6_months'
          enps_score?: number
          tools_freedom?: number
          lives_values?: number
          safe_seen?: number
          comment?: string | null
          created_on?: string
        }
        Relationships: []
      }
      employee_survey_completions: {
        Row: {
          id: string
          profile_id: string
          quarter: string
          completed_at: string
        }
        Insert: {
          id?: string
          profile_id: string
          quarter: string
          completed_at?: string
        }
        Update: {
          id?: string
          profile_id?: string
          quarter?: string
          completed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'employee_survey_completions_profile_id_fkey'
            columns: ['profile_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      }
      process_edit_locks: {
        Row: {
          process_id: string
          locked_by: string
          locked_by_name: string
          locked_at: string
        }
        Insert: {
          process_id: string
          locked_by: string
          locked_by_name: string
          locked_at?: string
        }
        Update: {
          process_id?: string
          locked_by?: string
          locked_by_name?: string
          locked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'process_edit_locks_locked_by_fkey'
            columns: ['locked_by']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'process_edit_locks_process_id_fkey'
            columns: ['process_id']
            isOneToOne: true
            referencedRelation: 'processes'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_profile_branch: {
        Args: { user_id: string }
        Returns: {
          id: string
          email: string
          full_name: string
          preferred_name: string | null
          job_title: string
          job_description: string | null
          start_date: string
          profile_photo_url: string | null
          phone: string | null
          location: string | null
          department_id: string | null
          manager_id: string | null
          social_links: Json | null
          is_admin: boolean
          is_manager: boolean
          is_executive: boolean
          is_super_admin: boolean
          is_process_editor: boolean
          onboarding_completed: boolean
          employment_status: 'active' | 'terminated'
          terminated_at: string | null
          termination_effective_at: string | null
          termination_reason: string | null
          terminated_by: string | null
          archived_at: string | null
          created_at: string
          updated_at: string
        }[]
      }
      get_public_org_share_bundle: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_public_process_bundle: {
        Args: { p_slug: string }
        Returns: Json
      }
      set_operations_tab_link: {
        Args: {
          p_tab_key: 'processes' | 'sops' | 'field_safety_protocol'
          p_drive_url: string | null
        }
        Returns: {
          tab_key: 'processes' | 'sops' | 'field_safety_protocol'
          drive_url: string | null
          updated_by: string | null
          created_at: string
          updated_at: string
        }
      }
      get_manager_team: {
        Args: { p_manager_id: string }
        Returns: {
          id: string
          email: string
          full_name: string
          preferred_name: string | null
          job_title: string
          job_description: string | null
          start_date: string
          profile_photo_url: string | null
          phone: string | null
          location: string | null
          department_id: string | null
          manager_id: string | null
          social_links: Json | null
          is_admin: boolean
          is_manager: boolean
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }[]
      }
      can_edit_process_for_lock: {
        Args: {
          p_process_id: string
          p_user_id: string
        }
        Returns: boolean
      }
      is_admin_like: {
        Args: { p_user_id: string }
        Returns: boolean
      }
      acquire_process_edit_lock: {
        Args: { p_process_id: string }
        Returns: {
          acquired: boolean
          process_id: string
          locked_by: string
          locked_by_name: string
          locked_at: string
          message: string
        }[]
      }
      force_takeover_process_edit_lock: {
        Args: { p_process_id: string }
        Returns: {
          acquired: boolean
          process_id: string
          locked_by: string
          locked_by_name: string
          locked_at: string
          message: string
        }[]
      }
      submit_employee_survey: {
        Args: {
          p_tenure: string
          p_enps_score: number
          p_tools_freedom: number
          p_lives_values: number
          p_safe_seen: number
          p_comment?: string | null
        }
        Returns: string
      }
      current_survey_quarter: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      is_survey_window_open: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      release_process_edit_lock: {
        Args: { p_process_id: string }
        Returns: {
          released: boolean
          process_id: string
          locked_by: string | null
          locked_by_name: string | null
          locked_at: string | null
          message: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
