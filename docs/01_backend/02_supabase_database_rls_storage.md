# Backend 02 — Supabase database, RLS and Storage

## Agent objective

Set up Supabase as the main backend data layer.

## Scope

- Supabase CLI
- Postgres migrations
- RLS policies
- Storage buckets
- generated TypeScript database types

## Required tables

### profiles

- id uuid primary key
- user_id uuid unique not null
- email text not null
- full_name text
- avatar_url text
- created_at timestamptz
- updated_at timestamptz

### workspaces

- id uuid primary key
- owner_user_id uuid not null
- name text not null
- onboarding_completed boolean default false
- created_at timestamptz
- updated_at timestamptz

### workspace_members

- id uuid primary key
- workspace_id uuid references workspaces
- user_id uuid not null
- role text not null: owner/admin/member
- created_at timestamptz

### subscriptions

- id uuid primary key
- workspace_id uuid references workspaces
- stripe_customer_id text
- stripe_subscription_id text
- plan text default trial
- status text default trialing
- current_period_start timestamptz
- current_period_end timestamptz
- cancel_at_period_end boolean default false
- created_at timestamptz
- updated_at timestamptz

### usage_counters

- id uuid primary key
- workspace_id uuid references workspaces
- period_start timestamptz
- period_end timestamptz
- generated_tracks_count int default 0
- uploaded_videos_count int default 0
- connected_channels_count int default 0
- scheduled_uploads_count int default 0
- created_at timestamptz
- updated_at timestamptz

### suno_connections

- id uuid primary key
- workspace_id uuid references workspaces
- label text
- encrypted_cookie text
- encrypted_api_url text
- status text default unknown
- credits_left int
- monthly_limit int
- monthly_usage int
- last_checked_at timestamptz
- last_error text
- created_at timestamptz
- updated_at timestamptz

### youtube_connections

- id uuid primary key
- workspace_id uuid references workspaces
- provider_account_email text
- encrypted_access_token text
- encrypted_refresh_token text
- token_expires_at timestamptz
- scopes text[]
- status text default connected
- created_at timestamptz
- updated_at timestamptz

### youtube_channels

- id uuid primary key
- workspace_id uuid references workspaces
- youtube_connection_id uuid references youtube_connections
- youtube_channel_id text not null
- title text not null
- handle text
- thumbnail_url text
- is_default boolean default false
- status text default connected
- last_sync_at timestamptz
- created_at timestamptz
- updated_at timestamptz

### image_assets

- id uuid primary key
- workspace_id uuid references workspaces
- storage_path text not null
- public_url text
- file_name text
- mime_type text
- width int
- height int
- source text: uploaded/fallback/generated_later
- created_at timestamptz

### generation_requests

- id uuid primary key
- workspace_id uuid references workspaces
- created_by_user_id uuid not null
- style text not null
- mood text not null
- duration_seconds int not null
- track_count int not null
- target_youtube_channel_id uuid references youtube_channels
- image_asset_id uuid references image_assets
- publish_mode text: draft/publish_now/schedule_later
- scheduled_at timestamptz
- status text
- prompt_summary text
- final_prompt text
- created_at timestamptz
- updated_at timestamptz

### tracks

- id uuid primary key
- workspace_id uuid references workspaces
- generation_request_id uuid references generation_requests
- suno_track_id text
- title text
- description text
- tags text[]
- style text
- mood text
- duration_seconds int
- audio_storage_path text
- source_audio_url text
- image_asset_id uuid references image_assets
- status text
- failure_reason text
- created_at timestamptz
- updated_at timestamptz

### video_renders

- id uuid primary key
- workspace_id uuid references workspaces
- track_id uuid references tracks
- status text
- video_storage_path text
- failure_reason text
- started_at timestamptz
- finished_at timestamptz
- created_at timestamptz
- updated_at timestamptz

### youtube_uploads

- id uuid primary key
- workspace_id uuid references workspaces
- track_id uuid references tracks
- video_render_id uuid references video_renders
- youtube_channel_id uuid references youtube_channels
- youtube_video_id text
- title text not null
- description text
- tags text[]
- privacy_status text: private/unlisted/public
- scheduled_at timestamptz
- status text
- failure_reason text
- uploaded_at timestamptz
- created_at timestamptz
- updated_at timestamptz

### prompt_history

- id uuid primary key
- workspace_id uuid references workspaces
- generation_request_id uuid references generation_requests
- style text not null
- mood text not null
- duration_seconds int
- track_count int
- final_prompt text
- created_at timestamptz

### audit_logs

- id uuid primary key
- workspace_id uuid references workspaces
- user_id uuid
- action text not null
- entity_type text
- entity_id uuid
- metadata jsonb
- created_at timestamptz

## Storage buckets

Create private buckets:

- image-assets
- audio-assets
- video-renders
- temp

Access through signed URLs. Worker/service role can read/write.

## RLS requirements

Enable RLS on all workspace-owned tables.

Policy pattern:

- user can select rows where user is member of row workspace
- owner/admin can insert/update workspace resources
- service role used only server/worker side
- unauthenticated users cannot access workspace data

## Required indexes

- `workspace_id` on all workspace-owned tables
- `user_id` on profiles/workspace_members
- `status` on tracks/generation_requests/video_renders/youtube_uploads
- `scheduled_at` on youtube_uploads
- `created_at` for sorted list views

## Type generation script

```json
{
  "db:types": "supabase gen types typescript --local > src/lib/database.types.ts"
}
```

## Acceptance criteria

- Migrations apply cleanly.
- RLS is enabled.
- Storage buckets exist.
- TypeScript DB types generated.
- Cross-workspace access is blocked.
- Local Supabase reset works.

## Tests required

Integration tests:

- user A cannot read user B workspace rows
- workspace owner can read own rows
- unauthenticated read blocked
- storage signed URL helper works with mocked path
