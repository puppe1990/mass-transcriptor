# Whisper Workspace Language Setting Design

**Date:** 2026-04-04

## Goal

Allow each workspace to choose the default language used by the Whisper provider from the frontend settings page.

## Scope

This change is limited to workspace-level configuration.

Included:

- Selecting a Whisper default language in the frontend settings page
- Persisting the selected value per tenant in backend provider settings
- Applying the configured language when a job is transcribed with Whisper
- Supporting a small curated language list in the UI

Excluded:

- Per-upload language overrides
- Arbitrary free-text language input
- Whisper model selection
- AssemblyAI language configuration

## Product Behavior

The settings page will expose a new Whisper language selector with these values:

- `auto`
- `pt`
- `en`
- `es`

Behavior:

- `auto` means no explicit `language` argument is sent to Whisper, so Whisper auto-detects.
- Any other value is passed directly to Whisper as `language=<code>`.
- The selected value is stored per workspace and reused for future Whisper jobs in that workspace.

## Architecture

### Data Model

Reuse the existing `tenant_provider_settings` table and store Whisper configuration in `config_json` under provider key `whisper`.

Expected config shape:

```json
{
  "language": "auto"
}
```

No schema migration is required because the project already stores provider-specific JSON config.

### API

`GET /t/{tenant_slug}/settings/providers`

- Add `whisper_language` to the response payload.
- If the workspace has no saved Whisper config, return `auto`.

`PATCH /t/{tenant_slug}/settings/providers`

- Accept `whisper_language`.
- Validate against the allowed set: `auto`, `pt`, `en`, `es`.
- Persist the value into the Whisper provider setting record.

### Backend Service Logic

`provider_settings.py` will:

- read Whisper config from `tenant_provider_settings`
- default to `auto` when unset
- validate the incoming language value
- upsert the Whisper provider config independently of AssemblyAI settings

### Whisper Execution

`whisper_provider.py` will:

- resolve the current tenant's Whisper config before transcription
- call `model.transcribe(file_path)` when language is `auto`
- call `model.transcribe(file_path, language=<code>)` when the workspace selected a specific language

## Frontend Design

`SettingsPage` will add a new field in the provider/settings area:

- label for Whisper default language
- select with options `Auto detect`, `Portuguese`, `English`, `Spanish`

The page will:

- load the current value from provider settings
- submit it with the existing settings form
- keep the current UX pattern for success and error states

## Validation and Errors

Backend validation:

- reject unsupported values with `422`

Frontend behavior:

- only offer supported values, so normal usage should not hit validation errors
- if the backend still rejects the request, surface the returned error through the existing settings error message flow

## Testing

Backend tests:

- provider settings serialization returns `whisper_language`
- provider settings update persists and validates `whisper_language`
- whisper provider passes `language` only when not `auto`

Frontend tests:

- settings page loads the saved Whisper language
- user can change and submit the Whisper language
- submitted payload includes `whisper_language`

## Risks

- The current Whisper provider API must have access to tenant-scoped config at execution time; if it only receives a file path today, the job execution path may need a small interface adjustment.
- Existing tests likely assume the old settings payload shape and will need coordinated updates.
