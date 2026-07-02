export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string | null;
          id: string;
          metadata: Json;
          user_id: string | null;
          workspace_id: string;
        };
        Insert: {
          action: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          metadata?: Json;
          user_id?: string | null;
          workspace_id: string;
        };
        Update: {
          action?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string | null;
          id?: string;
          metadata?: Json;
          user_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "audit_logs_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      generation_requests: {
        Row: {
          created_at: string;
          created_by_user_id: string;
          duration_seconds: number;
          failure_reason: string | null;
          final_prompt: string | null;
          id: string;
          image_asset_id: string | null;
          mood: string;
          prompt_summary: string | null;
          publish_mode: Database["public"]["Enums"]["publish_mode"];
          scheduled_at: string | null;
          status: string;
          style: string;
          target_youtube_channel_id: string | null;
          track_count: number;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          created_by_user_id: string;
          duration_seconds: number;
          failure_reason?: string | null;
          final_prompt?: string | null;
          id?: string;
          image_asset_id?: string | null;
          mood: string;
          prompt_summary?: string | null;
          publish_mode?: Database["public"]["Enums"]["publish_mode"];
          scheduled_at?: string | null;
          status?: string;
          style: string;
          target_youtube_channel_id?: string | null;
          track_count: number;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by_user_id?: string;
          duration_seconds?: number;
          failure_reason?: string | null;
          final_prompt?: string | null;
          id?: string;
          image_asset_id?: string | null;
          mood?: string;
          prompt_summary?: string | null;
          publish_mode?: Database["public"]["Enums"]["publish_mode"];
          scheduled_at?: string | null;
          status?: string;
          style?: string;
          target_youtube_channel_id?: string | null;
          track_count?: number;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "generation_requests_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "generation_requests_workspace_id_image_asset_id_fkey";
            columns: ["workspace_id", "image_asset_id"];
            isOneToOne: false;
            referencedRelation: "image_assets";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "generation_requests_workspace_id_target_youtube_channel_id_fkey";
            columns: ["workspace_id", "target_youtube_channel_id"];
            isOneToOne: false;
            referencedRelation: "youtube_channels";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      image_assets: {
        Row: {
          created_at: string;
          file_name: string | null;
          height: number | null;
          id: string;
          mime_type: string | null;
          public_url: string | null;
          source: Database["public"]["Enums"]["asset_source"];
          storage_path: string;
          width: number | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          file_name?: string | null;
          height?: number | null;
          id?: string;
          mime_type?: string | null;
          public_url?: string | null;
          source?: Database["public"]["Enums"]["asset_source"];
          storage_path: string;
          width?: number | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          file_name?: string | null;
          height?: number | null;
          id?: string;
          mime_type?: string | null;
          public_url?: string | null;
          source?: Database["public"]["Enums"]["asset_source"];
          storage_path?: string;
          width?: number | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "image_assets_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string;
          full_name: string | null;
          id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      prompt_history: {
        Row: {
          created_at: string;
          duration_seconds: number | null;
          final_prompt: string | null;
          generation_request_id: string | null;
          id: string;
          mood: string;
          style: string;
          track_count: number | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          duration_seconds?: number | null;
          final_prompt?: string | null;
          generation_request_id?: string | null;
          id?: string;
          mood: string;
          style: string;
          track_count?: number | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          duration_seconds?: number | null;
          final_prompt?: string | null;
          generation_request_id?: string | null;
          id?: string;
          mood?: string;
          style?: string;
          track_count?: number | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prompt_history_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "prompt_history_workspace_id_generation_request_id_fkey";
            columns: ["workspace_id", "generation_request_id"];
            isOneToOne: false;
            referencedRelation: "generation_requests";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      stripe_webhook_events: {
        Row: {
          event_type: string;
          id: string;
          received_at: string;
        };
        Insert: {
          event_type: string;
          id: string;
          received_at?: string;
        };
        Update: {
          event_type?: string;
          id?: string;
          received_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean;
          created_at: string;
          current_period_end: string | null;
          current_period_start: string | null;
          id: string;
          plan: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          cancel_at_period_end?: boolean;
          created_at?: string;
          current_period_end?: string | null;
          current_period_start?: string | null;
          id?: string;
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      suno_connections: {
        Row: {
          created_at: string;
          credits_left: number | null;
          encrypted_api_url: string | null;
          encrypted_cookie: string | null;
          id: string;
          label: string | null;
          last_checked_at: string | null;
          last_error: string | null;
          monthly_limit: number | null;
          monthly_usage: number | null;
          status: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          credits_left?: number | null;
          encrypted_api_url?: string | null;
          encrypted_cookie?: string | null;
          id?: string;
          label?: string | null;
          last_checked_at?: string | null;
          last_error?: string | null;
          monthly_limit?: number | null;
          monthly_usage?: number | null;
          status?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          credits_left?: number | null;
          encrypted_api_url?: string | null;
          encrypted_cookie?: string | null;
          id?: string;
          label?: string | null;
          last_checked_at?: string | null;
          last_error?: string | null;
          monthly_limit?: number | null;
          monthly_usage?: number | null;
          status?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "suno_connections_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      tracks: {
        Row: {
          audio_storage_path: string | null;
          created_at: string;
          description: string | null;
          duration_seconds: number | null;
          failure_reason: string | null;
          generation_request_id: string | null;
          id: string;
          image_asset_id: string | null;
          mood: string | null;
          source_audio_url: string | null;
          status: string;
          style: string | null;
          suno_track_id: string | null;
          tags: string[] | null;
          title: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          audio_storage_path?: string | null;
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          failure_reason?: string | null;
          generation_request_id?: string | null;
          id?: string;
          image_asset_id?: string | null;
          mood?: string | null;
          source_audio_url?: string | null;
          status?: string;
          style?: string | null;
          suno_track_id?: string | null;
          tags?: string[] | null;
          title?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          audio_storage_path?: string | null;
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          failure_reason?: string | null;
          generation_request_id?: string | null;
          id?: string;
          image_asset_id?: string | null;
          mood?: string | null;
          source_audio_url?: string | null;
          status?: string;
          style?: string | null;
          suno_track_id?: string | null;
          tags?: string[] | null;
          title?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tracks_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracks_workspace_id_generation_request_id_fkey";
            columns: ["workspace_id", "generation_request_id"];
            isOneToOne: false;
            referencedRelation: "generation_requests";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "tracks_workspace_id_image_asset_id_fkey";
            columns: ["workspace_id", "image_asset_id"];
            isOneToOne: false;
            referencedRelation: "image_assets";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      usage_counters: {
        Row: {
          connected_channels_count: number;
          created_at: string;
          generated_tracks_count: number;
          id: string;
          period_end: string;
          period_start: string;
          scheduled_uploads_count: number;
          updated_at: string;
          uploaded_videos_count: number;
          workspace_id: string;
        };
        Insert: {
          connected_channels_count?: number;
          created_at?: string;
          generated_tracks_count?: number;
          id?: string;
          period_end: string;
          period_start: string;
          scheduled_uploads_count?: number;
          updated_at?: string;
          uploaded_videos_count?: number;
          workspace_id: string;
        };
        Update: {
          connected_channels_count?: number;
          created_at?: string;
          generated_tracks_count?: number;
          id?: string;
          period_end?: string;
          period_start?: string;
          scheduled_uploads_count?: number;
          updated_at?: string;
          uploaded_videos_count?: number;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "usage_counters_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      video_renders: {
        Row: {
          created_at: string;
          failure_reason: string | null;
          finished_at: string | null;
          id: string;
          started_at: string | null;
          status: string;
          track_id: string | null;
          updated_at: string;
          video_storage_path: string | null;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          failure_reason?: string | null;
          finished_at?: string | null;
          id?: string;
          started_at?: string | null;
          status?: string;
          track_id?: string | null;
          updated_at?: string;
          video_storage_path?: string | null;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          failure_reason?: string | null;
          finished_at?: string | null;
          id?: string;
          started_at?: string | null;
          status?: string;
          track_id?: string | null;
          updated_at?: string;
          video_storage_path?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "video_renders_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "video_renders_workspace_id_track_id_fkey";
            columns: ["workspace_id", "track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      workspace_members: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["workspace_role"];
          user_id: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["workspace_role"];
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspace_settings: {
        Row: {
          auto_normalize_audio: boolean;
          created_at: string;
          default_bpm: number;
          default_format: string;
          default_genre: string;
          default_image_asset_id: string | null;
          default_key: string;
          default_license: string;
          default_mood: string;
          default_privacy_status: Database["public"]["Enums"]["youtube_privacy_status"];
          default_storage_location: string;
          default_youtube_channel_id: string | null;
          extract_stems_on_upload: boolean;
          notify_billing_payments: boolean;
          notify_generation_completions: boolean;
          notify_marketing_emails: boolean;
          notify_product_updates: boolean;
          timezone: string;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          auto_normalize_audio?: boolean;
          created_at?: string;
          default_bpm?: number;
          default_format?: string;
          default_genre?: string;
          default_image_asset_id?: string | null;
          default_key?: string;
          default_license?: string;
          default_mood?: string;
          default_privacy_status?: Database["public"]["Enums"]["youtube_privacy_status"];
          default_storage_location?: string;
          default_youtube_channel_id?: string | null;
          extract_stems_on_upload?: boolean;
          notify_billing_payments?: boolean;
          notify_generation_completions?: boolean;
          notify_marketing_emails?: boolean;
          notify_product_updates?: boolean;
          timezone?: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          auto_normalize_audio?: boolean;
          created_at?: string;
          default_bpm?: number;
          default_format?: string;
          default_genre?: string;
          default_image_asset_id?: string | null;
          default_key?: string;
          default_license?: string;
          default_mood?: string;
          default_privacy_status?: Database["public"]["Enums"]["youtube_privacy_status"];
          default_storage_location?: string;
          default_youtube_channel_id?: string | null;
          extract_stems_on_upload?: boolean;
          notify_billing_payments?: boolean;
          notify_generation_completions?: boolean;
          notify_marketing_emails?: boolean;
          notify_product_updates?: boolean;
          timezone?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workspace_settings_workspace_id_default_image_asset_id_fkey";
            columns: ["workspace_id", "default_image_asset_id"];
            isOneToOne: false;
            referencedRelation: "image_assets";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "workspace_settings_workspace_id_default_youtube_channel_id_fkey";
            columns: ["workspace_id", "default_youtube_channel_id"];
            isOneToOne: false;
            referencedRelation: "youtube_channels";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "workspace_settings_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: true;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          id: string;
          name: string;
          onboarding_completed: boolean;
          owner_user_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          name: string;
          onboarding_completed?: boolean;
          owner_user_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          name?: string;
          onboarding_completed?: boolean;
          owner_user_id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      youtube_channels: {
        Row: {
          created_at: string;
          handle: string | null;
          id: string;
          is_default: boolean;
          last_sync_at: string | null;
          status: string;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
          workspace_id: string;
          youtube_channel_id: string;
          youtube_connection_id: string | null;
        };
        Insert: {
          created_at?: string;
          handle?: string | null;
          id?: string;
          is_default?: boolean;
          last_sync_at?: string | null;
          status?: string;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
          workspace_id: string;
          youtube_channel_id: string;
          youtube_connection_id?: string | null;
        };
        Update: {
          created_at?: string;
          handle?: string | null;
          id?: string;
          is_default?: boolean;
          last_sync_at?: string | null;
          status?: string;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
          workspace_id?: string;
          youtube_channel_id?: string;
          youtube_connection_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "youtube_channels_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "youtube_channels_workspace_id_youtube_connection_id_fkey";
            columns: ["workspace_id", "youtube_connection_id"];
            isOneToOne: false;
            referencedRelation: "youtube_connections";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
      youtube_connections: {
        Row: {
          created_at: string;
          encrypted_access_token: string | null;
          encrypted_refresh_token: string | null;
          id: string;
          provider_account_email: string | null;
          scopes: string[] | null;
          status: string;
          token_expires_at: string | null;
          updated_at: string;
          workspace_id: string;
        };
        Insert: {
          created_at?: string;
          encrypted_access_token?: string | null;
          encrypted_refresh_token?: string | null;
          id?: string;
          provider_account_email?: string | null;
          scopes?: string[] | null;
          status?: string;
          token_expires_at?: string | null;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          encrypted_access_token?: string | null;
          encrypted_refresh_token?: string | null;
          id?: string;
          provider_account_email?: string | null;
          scopes?: string[] | null;
          status?: string;
          token_expires_at?: string | null;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "youtube_connections_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
        ];
      };
      youtube_uploads: {
        Row: {
          created_at: string;
          description: string | null;
          failure_reason: string | null;
          id: string;
          privacy_status: Database["public"]["Enums"]["youtube_privacy_status"];
          scheduled_at: string | null;
          status: string;
          tags: string[] | null;
          title: string;
          track_id: string | null;
          updated_at: string;
          uploaded_at: string | null;
          video_render_id: string | null;
          workspace_id: string;
          youtube_channel_id: string | null;
          youtube_video_id: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          failure_reason?: string | null;
          id?: string;
          privacy_status?: Database["public"]["Enums"]["youtube_privacy_status"];
          scheduled_at?: string | null;
          status?: string;
          tags?: string[] | null;
          title: string;
          track_id?: string | null;
          updated_at?: string;
          uploaded_at?: string | null;
          video_render_id?: string | null;
          workspace_id: string;
          youtube_channel_id?: string | null;
          youtube_video_id?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          failure_reason?: string | null;
          id?: string;
          privacy_status?: Database["public"]["Enums"]["youtube_privacy_status"];
          scheduled_at?: string | null;
          status?: string;
          tags?: string[] | null;
          title?: string;
          track_id?: string | null;
          updated_at?: string;
          uploaded_at?: string | null;
          video_render_id?: string | null;
          workspace_id?: string;
          youtube_channel_id?: string | null;
          youtube_video_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "youtube_uploads_workspace_id_fkey";
            columns: ["workspace_id"];
            isOneToOne: false;
            referencedRelation: "workspaces";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "youtube_uploads_workspace_id_track_id_fkey";
            columns: ["workspace_id", "track_id"];
            isOneToOne: false;
            referencedRelation: "tracks";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "youtube_uploads_workspace_id_video_render_id_fkey";
            columns: ["workspace_id", "video_render_id"];
            isOneToOne: false;
            referencedRelation: "video_renders";
            referencedColumns: ["workspace_id", "id"];
          },
          {
            foreignKeyName: "youtube_uploads_workspace_id_youtube_channel_id_fkey";
            columns: ["workspace_id", "youtube_channel_id"];
            isOneToOne: false;
            referencedRelation: "youtube_channels";
            referencedColumns: ["workspace_id", "id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      can_manage_workspace: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      dispatch_scheduled_youtube_uploads: { Args: never; Returns: number };
      increment_usage_counter: {
        Args: {
          connected_channels_delta?: number;
          generated_tracks_delta?: number;
          scheduled_uploads_delta?: number;
          target_period_end: string;
          target_period_start: string;
          target_workspace_id: string;
          uploaded_videos_delta?: number;
        };
        Returns: {
          connected_channels_count: number;
          created_at: string;
          generated_tracks_count: number;
          id: string;
          period_end: string;
          period_start: string;
          scheduled_uploads_count: number;
          updated_at: string;
          uploaded_videos_count: number;
          workspace_id: string;
        };
        SetofOptions: {
          from: "*";
          to: "usage_counters";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      is_workspace_member: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      list_stale_temp_objects: {
        Args: { older_than_days?: number };
        Returns: {
          name: string;
        }[];
      };
      publish_youtube_upload_now: {
        Args: {
          acting_user_id: string;
          target_upload_id: string;
          target_workspace_id: string;
        };
        Returns: {
          id: string;
          scheduled_at: string;
          status: string;
          track_id: string;
          video_render_id: string;
          workspace_id: string;
        }[];
      };
      recover_stale_jobs: { Args: { stale_minutes?: number }; Returns: Json };
      reserve_monthly_upload_capacity: {
        Args: {
          target_period_end: string;
          target_period_start: string;
          target_workspace_id: string;
        };
        Returns: Json;
      };
      search_library_tracks: {
        Args: {
          p_channel_id?: string;
          p_created_after?: string;
          p_limit?: number;
          p_mood?: string;
          p_offset?: number;
          p_query?: string;
          p_status?: string;
          p_workspace_id: string;
        };
        Returns: {
          created_at: string;
          duration_seconds: number;
          failure_reason: string;
          generation_request_id: string;
          id: string;
          image_asset_id: string;
          mood: string;
          status: string;
          style: string;
          tags: string[];
          title: string;
          total_count: number;
          workspace_id: string;
        }[];
      };
      storage_workspace_id: { Args: { object_name: string }; Returns: string };
      worker_queue_ack: {
        Args: { message_id: number; queue_name: string };
        Returns: boolean;
      };
      worker_queue_read: {
        Args: {
          max_messages: number;
          queue_name: string;
          visibility_timeout_seconds: number;
        };
        Returns: {
          enqueued_at: string;
          message: Json;
          msg_id: number;
          read_ct: number;
          vt: string;
        }[];
      };
      worker_queue_retry: {
        Args: { delay_seconds: number; message_id: number; queue_name: string };
        Returns: undefined;
      };
      worker_queue_send: {
        Args: { delay_seconds?: number; message: Json; queue_name: string };
        Returns: number;
      };
      workspace_role_for_current_user: {
        Args: { target_workspace_id: string };
        Returns: Database["public"]["Enums"]["workspace_role"];
      };
    };
    Enums: {
      asset_source: "uploaded" | "fallback" | "generated_later";
      publish_mode: "draft" | "publish_now" | "schedule_later";
      workspace_role: "owner" | "admin" | "member";
      youtube_privacy_status: "private" | "unlisted" | "public";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string | null;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      iceberg_namespaces: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
        ];
      };
      iceberg_tables: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id: string | null;
          shard_id: string | null;
          shard_key: string | null;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          namespace_id?: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey";
            columns: ["namespace_id"];
            isOneToOne: false;
            referencedRelation: "iceberg_namespaces";
            referencedColumns: ["id"];
          },
        ];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "s3_multipart_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets_vectors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      asset_source: ["uploaded", "fallback", "generated_later"],
      publish_mode: ["draft", "publish_now", "schedule_later"],
      workspace_role: ["owner", "admin", "member"],
      youtube_privacy_status: ["private", "unlisted", "public"],
    },
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const;
