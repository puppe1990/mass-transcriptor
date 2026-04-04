# Multi-Tenant Audio Transcriber Design

**Date:** 2026-04-03

## Goal

Build a multi-tenant audio transcription application with a React frontend and a FastAPI backend that accepts audio uploads, processes transcription jobs asynchronously, and stores both the original audio and generated Markdown transcript on local disk.

## Product Scope

This is an MVP focused on:

- Uploading audio files per tenant
- Queueing transcription jobs asynchronously
- Supporting multiple transcription providers behind one interface
- Persisting job state and transcript metadata in SQLite
- Saving source audio and generated Markdown files on local disk
- Viewing job status and transcript results in a simple web UI

This MVP does not include:

- User authentication and permissions
- Real-time push updates
- Cloud object storage
- Horizontal worker scaling
- Billing or tenant self-service administration

## Key Decisions

### Multi-tenancy

Tenants are identified by slug in the URL, for example:

- `/t/acme/uploads`
- `/t/acme/jobs`
- `/t/acme/jobs/:jobId`

This keeps tenant resolution explicit and easy to debug in local development. Tenant resolution should still live in a dedicated backend layer so the transport mechanism can later change to subdomains without rewriting business logic.

### Processing Model

Transcription runs asynchronously. Upload requests only save the file, create a job, and return quickly. A separate worker process picks up queued jobs and performs transcription.

### Providers

The system starts with two providers:

- Local Whisper
- AssemblyAI

Providers must implement the same internal interface so new providers can be added later without changing API routes, job orchestration, or UI flow.

### Persistence

- `SQLite` stores tenants, uploads, jobs, results, and provider configuration
- Local disk stores original audio and generated Markdown files

## Architecture

The system is a simple monolith split into clear runtime roles:

1. `React frontend`
Presents tenant-scoped upload, job list, and job detail screens.

2. `FastAPI web API`
Accepts uploads, resolves tenant, creates jobs, exposes job status and transcript metadata, and serves file references.

3. `Worker process`
Polls queued jobs, runs transcription, writes results, and updates job status.

4. `SQLite database`
Persists tenant and job metadata.

5. `Local file storage`
Stores source audio files and generated Markdown transcripts.

This architecture is intentionally simple, but the boundaries around provider selection, storage, and job execution are explicit so the system can evolve without broad rewrites.

## Core Flow

### Upload Flow

1. User opens a tenant-scoped route such as `/t/acme/uploads`
2. User selects an audio file and submits it
3. Frontend sends multipart upload request to FastAPI
4. API validates tenant and file metadata
5. API stores the audio file on local disk
6. API creates an upload record and a transcription job with status `queued`
7. API returns job metadata immediately

### Processing Flow

1. Worker polls for the next queued job
2. Worker loads job, tenant, file path, and provider configuration
3. Worker marks the job as `processing`
4. Worker dispatches to the configured transcription provider
5. Provider returns transcript text and optional metadata
6. Worker renders transcript output to Markdown
7. Worker saves the Markdown file on local disk
8. Worker stores result metadata and marks job `completed`
9. If any step fails, worker marks job `failed` and stores error details

### Read Flow

1. Frontend polls job status endpoint
2. When the job completes, the detail screen shows transcript preview and links to the audio and Markdown file

## Backend Design

### Main Modules

- `api`
FastAPI routes, request schemas, response schemas

- `tenancy`
Tenant lookup and route-level tenant resolution

- `uploads`
File validation, path creation, upload record creation

- `jobs`
Job creation, state transitions, job queries

- `providers`
Shared transcription interface and provider implementations

- `worker`
Queued job polling and execution loop

- `storage`
Local disk abstraction for reading and writing audio and transcript files

- `db`
SQLite models, migrations, session management

### Provider Interface

The backend should define a provider contract such as:

- `transcribe(file_path, options) -> transcription result`

The result should include:

- plain transcript text
- optional language or detected metadata
- provider name
- provider job/reference id when available

Initial implementations:

- `WhisperProvider`
Runs local transcription using Whisper in-process from the worker

- `AssemblyAIProvider`
Uploads audio to AssemblyAI, waits or polls until completion inside the worker, then returns normalized text

The rest of the backend must depend only on the shared provider interface.

### Job States

Recommended job state model:

- `queued`
- `processing`
- `completed`
- `failed`

Optional future states:

- `canceled`
- `retrying`

### Failure Handling

The worker must persist structured failure information:

- error category
- human-readable message
- failed timestamp
- provider context when relevant

The API should expose enough failure detail for the frontend to inform the user without leaking raw stack traces.

## Database Model

Recommended initial tables:

### `tenants`

- `id`
- `slug`
- `name`
- `default_provider`
- `created_at`
- `updated_at`

### `tenant_provider_settings`

- `id`
- `tenant_id`
- `provider_key`
- `enabled`
- `config_json`
- `created_at`
- `updated_at`

This supports provider-specific settings per tenant without hardcoding schema for every future provider.

### `uploads`

- `id`
- `tenant_id`
- `original_filename`
- `mime_type`
- `size_bytes`
- `audio_path`
- `created_at`

### `transcription_jobs`

- `id`
- `tenant_id`
- `upload_id`
- `provider_key`
- `status`
- `error_message`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

### `transcription_results`

- `id`
- `job_id`
- `tenant_id`
- `markdown_path`
- `transcript_text`
- `provider_metadata_json`
- `created_at`

Storing transcript text in SQLite is useful for UI preview and filtering. The `.md` file remains the canonical exported artifact on disk.

## File Storage Layout

Use a tenant-scoped directory structure such as:

```text
storage/
  acme/
    uploads/
      <upload-id>/
        audio/<original-file>
        transcript/transcript.md
```

Rules:

- every upload gets its own directory
- the API stores the original file name as metadata, not as the primary locator
- storage path generation must be centralized in the storage layer
- the database stores file paths as relative application paths where possible

## Frontend Design

### Routes

- `/t/:tenantSlug/uploads`
- `/t/:tenantSlug/jobs`
- `/t/:tenantSlug/jobs/:jobId`

### Screens

#### Upload screen

- file picker
- submit button
- validation feedback
- recent jobs shortcut

#### Jobs list screen

- rows/cards with filename, provider, created time, and status
- filters can be deferred unless trivially cheap

#### Job detail screen

- job status
- provider used
- audio file access
- transcript preview
- Markdown download link
- failure message when relevant

### Frontend Data Behavior

Use simple polling in the MVP:

- poll the job detail endpoint while status is `queued` or `processing`
- stop polling when status becomes terminal

Avoid websocket complexity in the first version.

## API Shape

Recommended endpoints:

- `POST /t/{tenant_slug}/uploads`
Creates upload and queued transcription job

- `GET /t/{tenant_slug}/jobs`
Lists jobs for tenant

- `GET /t/{tenant_slug}/jobs/{job_id}`
Returns job detail and result metadata

- `GET /t/{tenant_slug}/files/...`
Serves or proxies local files if needed

Optional early admin endpoints:

- `POST /t/{tenant_slug}/jobs/{job_id}/retry`
- `PATCH /t/{tenant_slug}/provider-settings`

These can be deferred if they slow the MVP.

## Operational Constraints

Because SQLite and local disk are part of the MVP design:

- run a single worker process initially
- avoid concurrent write-heavy patterns
- ensure upload and worker processes share the same filesystem
- treat this as a local or small-scale deployment target

When scale requirements appear, the likely migration path is:

- SQLite to Postgres
- local disk to object storage
- polling worker to managed queue

The internal abstractions should make those migrations additive rather than disruptive.

## Security and Validation

MVP-level protections should include:

- file type and size validation
- safe path generation with no user-controlled path fragments
- tenant scoping on every query
- environment-based secrets for provider credentials
- no raw provider secrets returned to the frontend

Authentication is intentionally out of scope for the first version.

## Testing Strategy

### Backend

- unit tests for provider selection and tenant resolution
- unit tests for storage path generation
- unit tests for job state transitions
- integration tests for upload endpoint and job creation
- integration tests for worker success and failure paths with mocked providers

### Frontend

- component tests for upload form states
- component tests for jobs list rendering
- component tests for job detail status handling
- integration tests for polling behavior with mocked API responses

## MVP Success Criteria

The MVP is successful when:

- a tenant can upload an audio file
- the system creates a queued job immediately
- a worker completes transcription using either Whisper or AssemblyAI
- the system stores both audio and Markdown transcript on local disk
- the UI shows job status and transcript result correctly
- new providers can be added by implementing the provider interface and registering them

## Recommended Build Order

1. Backend foundations and data model
2. Local storage and upload handling
3. Async job worker and job lifecycle
4. Provider abstraction plus Whisper provider
5. AssemblyAI provider
6. React tenant-scoped screens
7. End-to-end polish and error handling

## Open Assumptions Locked For MVP

These assumptions are now explicit to avoid ambiguity:

- no user authentication in v1
- tenant identity comes from route slug
- storage is local disk only
- database is SQLite only
- updates use polling rather than websockets
- one worker process is the supported initial topology
