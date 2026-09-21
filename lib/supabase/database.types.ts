export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_users: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          organization_id: string | null
          role: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id: string
          organization_id?: string | null
          role: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          organization_id?: string | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          incident_id: string
          responder_id: string
          status: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          incident_id: string
          responder_id: string
          status?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          incident_id?: string
          responder_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "responders"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string | null
          id: string
          incident_id: string
          mime_type: string
          size_bytes: number | null
          storage_path: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          incident_id: string
          mime_type: string
          size_bytes?: number | null
          storage_path: string
        }
        Update: {
          created_at?: string | null
          id?: string
          incident_id?: string
          mime_type?: string
          size_bytes?: number | null
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_duplicates: {
        Row: {
          created_at: string | null
          id: string
          incident_id: string
          possible_duplicate_of: string
          resolution: string | null
          resolved_by: string | null
          similarity_score: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          incident_id: string
          possible_duplicate_of: string
          resolution?: string | null
          resolved_by?: string | null
          similarity_score?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          incident_id?: string
          possible_duplicate_of?: string
          resolution?: string | null
          resolved_by?: string | null
          similarity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_duplicates_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incident_duplicates_possible_duplicate_of_fkey"
            columns: ["possible_duplicate_of"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_events: {
        Row: {
          actor_id: string | null
          actor_role: string | null
          created_at: string | null
          event_type: string
          id: string
          incident_id: string
          payload: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          event_type: string
          id?: string
          incident_id: string
          payload?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string | null
          event_type?: string
          id?: string
          incident_id?: string
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "incident_events_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      incidents: {
        Row: {
          ai_status: string
          client_id: string
          confidence: number | null
          created_at: string | null
          evidence: Json | null
          hazards: Json | null
          id: string
          incident_type: string | null
          latitude: number | null
          location_confidence: number | null
          location_source: string | null
          location_text: string | null
          longitude: number | null
          missing_information: Json | null
          needs_human_review: boolean | null
          offline_created: boolean | null
          people_affected: number | null
          raw_text: string
          recommended_action: string | null
          recommended_service_types: Json | null
          status: string
          summary: string | null
          triage: string | null
          updated_at: string | null
          verification_status: string
        }
        Insert: {
          ai_status?: string
          client_id: string
          confidence?: number | null
          created_at?: string | null
          evidence?: Json | null
          hazards?: Json | null
          id?: string
          incident_type?: string | null
          latitude?: number | null
          location_confidence?: number | null
          location_source?: string | null
          location_text?: string | null
          longitude?: number | null
          missing_information?: Json | null
          needs_human_review?: boolean | null
          offline_created?: boolean | null
          people_affected?: number | null
          raw_text: string
          recommended_action?: string | null
          recommended_service_types?: Json | null
          status?: string
          summary?: string | null
          triage?: string | null
          updated_at?: string | null
          verification_status?: string
        }
        Update: {
          ai_status?: string
          client_id?: string
          confidence?: number | null
          created_at?: string | null
          evidence?: Json | null
          hazards?: Json | null
          id?: string
          incident_type?: string | null
          latitude?: number | null
          location_confidence?: number | null
          location_source?: string | null
          location_text?: string | null
          longitude?: number | null
          missing_information?: Json | null
          needs_human_review?: boolean | null
          offline_created?: boolean | null
          people_affected?: number | null
          raw_text?: string
          recommended_action?: string | null
          recommended_service_types?: Json | null
          status?: string
          summary?: string | null
          triage?: string | null
          updated_at?: string | null
          verification_status?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          channel: string
          enabled: boolean | null
          id: string
          responder_id: string
        }
        Insert: {
          channel: string
          enabled?: boolean | null
          id?: string
          responder_id: string
        }
        Update: {
          channel?: string
          enabled?: boolean | null
          id?: string
          responder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "responders"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          acknowledged_at: string | null
          approved_by: string | null
          channel: string
          created_at: string | null
          error: string | null
          id: string
          incident_id: string
          provider_message_id: string | null
          responder_id: string
          retry_count: number | null
          sent_at: string | null
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          approved_by?: string | null
          channel: string
          created_at?: string | null
          error?: string | null
          id?: string
          incident_id: string
          provider_message_id?: string | null
          responder_id: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          approved_by?: string | null
          channel?: string
          created_at?: string | null
          error?: string | null
          id?: string
          incident_id?: string
          provider_message_id?: string | null
          responder_id?: string
          retry_count?: number | null
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "app_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "responders"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      responders: {
        Row: {
          available: boolean | null
          contact_person: string | null
          coverage_area: string | null
          created_at: string | null
          email: string | null
          id: string
          latitude: number | null
          longitude: number | null
          organization: string
          organization_id: string | null
          phone: string | null
          service_type: string
          verified: boolean | null
        }
        Insert: {
          available?: boolean | null
          contact_person?: string | null
          coverage_area?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          organization: string
          organization_id?: string | null
          phone?: string | null
          service_type: string
          verified?: boolean | null
        }
        Update: {
          available?: boolean | null
          contact_person?: string | null
          coverage_area?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          latitude?: number | null
          longitude?: number | null
          organization?: string
          organization_id?: string | null
          phone?: string | null
          service_type?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "responders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: { Args: never; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
