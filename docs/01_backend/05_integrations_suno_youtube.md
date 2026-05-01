# Backend 05 — Suno and YouTube integrations

## Agent objective

Implement external adapters and connection flows for Suno and YouTube.

# Part A — Suno

## Files

```txt
src/modules/integrations/suno/
  suno-connection.schema.ts
  suno-connection.actions.ts
  suno-connection.queries.ts

src/server/services/suno/
  suno-adapter.ts
  suno.types.ts
  suno.errors.ts
```

## Adapter methods

- testConnection
- getLimits
- createCustomGeneration
- getTrackStatus
- getTrackById

## MVP generation input

- final prompt
- tags/style
- title
- make_instrumental: true
- wait_audio: false

## Stored fields

- encrypted_api_url
- encrypted_cookie
- status
- credits_left
- monthly_limit
- monthly_usage
- last_checked_at
- last_error

## Normalized errors

- unauthorized/expired cookie
- API unreachable
- quota exceeded
- invalid response
- generation failed
- timeout
- unknown

## Suno acceptance criteria

- User can save Suno connection.
- Secrets are encrypted.
- Test connection updates status.
- Limits sync works.
- Adapter is mockable.

# Part B — YouTube

## Files

```txt
src/modules/integrations/youtube/
  youtube-oauth.routes.ts
  youtube-channel.actions.ts
  youtube-channel.queries.ts

src/server/services/youtube/
  youtube-oauth.service.ts
  youtube-upload-adapter.ts
  youtube.types.ts
  youtube.errors.ts

supabase/functions/youtube-oauth-callback/
```

## OAuth flow

1. Authenticated user clicks Connect YouTube.
2. App creates Google OAuth URL.
3. App stores/verifies state token.
4. User grants access.
5. Callback exchanges code for tokens.
6. Tokens encrypted.
7. Connection saved.
8. Channels synced.
9. User returns to onboarding/settings.

## Stored fields

### youtube_connections

- provider_account_email
- encrypted_access_token
- encrypted_refresh_token
- token_expires_at
- scopes
- status

### youtube_channels

- youtube_channel_id
- title
- handle
- thumbnail_url
- is_default
- status
- last_sync_at

## Upload adapter methods

- refreshToken
- uploadVideo
- setMetadata
- schedulePublish

## Normalized errors

- invalid_grant
- expired_token
- quota_exceeded
- upload_failed
- invalid_metadata
- file_too_large
- forbidden
- unknown

## YouTube acceptance criteria

- User can connect YouTube.
- OAuth state is validated.
- Tokens encrypted.
- Channels sync after OAuth.
- User can set default channel.
- Upload adapter is mockable.

## Tests required

Unit:

- Suno error normalization
- YouTube error normalization
- token masking
- adapter input validation

Integration:

- Suno test connection mocked success/error
- YouTube OAuth callback mocked token exchange
- channel sync mocked response
- upload adapter mocked success/error
