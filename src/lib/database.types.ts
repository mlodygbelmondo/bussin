export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Timestamp = string;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = { [key: string]: any };

type PublicTable<Row extends AnyRecord = AnyRecord> = {
  Row: Row & AnyRecord;
  Insert: Partial<Row & AnyRecord>;
  Update: Partial<Row & AnyRecord>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      audit_logs: PublicTable;
      generation_requests: PublicTable<{
        created_at: Timestamp;
        duration_seconds: number;
        failure_reason: string | null;
        final_prompt: string | null;
        id: string;
        image_asset_id: string | null;
        mood: string;
        prompt_summary: string | null;
        publish_mode: Database["public"]["Enums"]["publish_mode"];
        scheduled_at: Timestamp | null;
        status: string;
        style: string;
        target_youtube_channel_id: string | null;
        track_count: number;
        updated_at: Timestamp;
        workspace_id: string;
        created_by_user_id: string;
      }>;
      image_assets: PublicTable<{
        created_at: Timestamp;
        file_name: string | null;
        height: number | null;
        id: string;
        mime_type: string | null;
        public_url: string | null;
        source: Database["public"]["Enums"]["asset_source"];
        storage_path: string;
        width: number | null;
        workspace_id: string;
      }>;
      profiles: PublicTable;
      prompt_history: PublicTable<{
        created_at: Timestamp;
        duration_seconds: number | null;
        final_prompt: string | null;
        generation_request_id: string | null;
        id: string;
        mood: string;
        style: string;
        track_count: number | null;
        workspace_id: string;
      }>;
      subscriptions: PublicTable;
      suno_connections: PublicTable<{
        created_at: Timestamp;
        credits_left: number | null;
        encrypted_api_url: string | null;
        encrypted_cookie: string | null;
        id: string;
        label: string | null;
        last_checked_at: Timestamp | null;
        last_error: string | null;
        monthly_limit: number | null;
        monthly_usage: number | null;
        status: string;
        updated_at: Timestamp;
        workspace_id: string;
      }>;
      tracks: PublicTable<{
        audio_storage_path: string | null;
        created_at: Timestamp;
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
        updated_at: Timestamp;
        workspace_id: string;
      }>;
      usage_counters: PublicTable;
      video_renders: PublicTable<{
        created_at: Timestamp;
        failure_reason: string | null;
        finished_at: Timestamp | null;
        id: string;
        started_at: Timestamp | null;
        status: string;
        track_id: string | null;
        updated_at: Timestamp;
        video_storage_path: string | null;
        workspace_id: string;
      }>;
      workspaces: PublicTable<{
        created_at: Timestamp;
        id: string;
        name: string;
        onboarding_completed: boolean;
        owner_user_id: string;
        updated_at: Timestamp;
      }>;
      workspace_members: PublicTable;
      workspace_settings: PublicTable<{
        auto_normalize_audio: boolean;
        created_at: Timestamp;
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
        updated_at: Timestamp;
        workspace_id: string;
      }>;
      youtube_channels: PublicTable<{
        created_at: Timestamp;
        handle: string | null;
        id: string;
        is_default: boolean;
        last_sync_at: Timestamp | null;
        status: string;
        thumbnail_url: string | null;
        title: string;
        updated_at: Timestamp;
        workspace_id: string;
        youtube_channel_id: string;
        youtube_connection_id: string | null;
      }>;
      youtube_connections: PublicTable<{
        created_at: Timestamp;
        encrypted_access_token: string | null;
        encrypted_refresh_token: string | null;
        id: string;
        provider_account_email: string | null;
        scopes: string[] | null;
        status: string;
        token_expires_at: Timestamp | null;
        updated_at: Timestamp;
        workspace_id: string;
      }>;
      youtube_uploads: PublicTable<{
        created_at: Timestamp;
        description: string | null;
        failure_reason: string | null;
        id: string;
        privacy_status: Database["public"]["Enums"]["youtube_privacy_status"];
        scheduled_at: Timestamp | null;
        status: string;
        tags: string[] | null;
        title: string;
        track_id: string | null;
        updated_at: Timestamp;
        uploaded_at: Timestamp | null;
        video_render_id: string | null;
        workspace_id: string;
        youtube_channel_id: string | null;
        youtube_video_id: string | null;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      search_library_tracks: {
        Args: {
          p_channel_id?: string | null;
          p_created_after?: Timestamp | null;
          p_limit?: number;
          p_mood?: string | null;
          p_offset?: number;
          p_query?: string | null;
          p_status?: string | null;
          p_workspace_id: string;
        };
        Returns: Array<{
          created_at: Timestamp;
          duration_seconds: number | null;
          failure_reason: string | null;
          generation_request_id: string | null;
          id: string;
          image_asset_id: string | null;
          mood: string | null;
          status: string;
          style: string | null;
          tags: string[] | null;
          title: string | null;
          total_count: number;
          workspace_id: string;
        }>;
      };
    };
    Enums: {
      asset_source: "uploaded" | "fallback" | "generated_later";
      publish_mode: "draft" | "publish_now" | "schedule_later";
      workspace_role: "owner" | "admin" | "member";
      youtube_privacy_status: "private" | "unlisted" | "public";
    };
    CompositeTypes: Record<string, never>;
  };
};

type DefaultSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database;
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;
