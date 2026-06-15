# Mass Transcriptor

Multi-tenant audio transcription MVP with React, FastAPI, SQLite, local storage, and asynchronous jobs.

## Local Development

1. Create a Python virtualenv in `backend/` and install the backend dependencies.
2. Run `npm install` in the repository root and in `frontend/`.
3. Copy `backend/.env.example` to `backend/.env`.
4. Start everything with `npm run dev` in the repository root.

If you want a single shell entrypoint, run `./start.sh` from the repository root. It validates the local setup, creates `backend/.env` from the example when needed, and starts API, worker, and frontend together.

## Notes

- Tenant scope lives in the URL path, such as `/t/acme/uploads`.
- Audio and generated Markdown files are stored under `storage/`.
- The default provider is `assemblyai`; `whisper` remains available as an alternative.
- Vite proxies `/api/*` requests to `http://127.0.0.1:8001` in local development.

## Real Transcription

The app is ready to run real transcriptions through either local Whisper or AssemblyAI.

### Whisper

1. Install `ffmpeg` on the machine.
2. In `backend/.env`, keep `DEFAULT_PROVIDER=assemblyai` or switch to `whisper` if you prefer local transcription.
3. Optionally change `WHISPER_MODEL` to `tiny`, `base`, `small`, `medium`, or `large`.
4. Start the stack with `npm run dev`.
5. Sign up, upload an audio file, and keep the worker process running. The generated transcript will be written to `storage/<tenant>/uploads/<upload-id>/transcript/transcript.md`.

### AssemblyAI

1. Set `ASSEMBLYAI_API_KEY` in `backend/.env`.
2. Start the stack with `npm run dev`.
3. Sign in and open `/t/<tenant>/settings`.
4. Choose `assemblyai` as the default provider and save the settings.
5. Upload an audio file and let the worker process complete the job.

`AssemblyAI` uses a single server-side API key from the environment. If the key is missing, selecting `assemblyai` as the default provider will fail with a clear validation error. If a provider is misconfigured at runtime, the job is marked as `failed` and the error is stored on the job detail endpoint instead of silently hanging.

## Authentication

- Sign up at `/signup` to create a new workspace and its owner account.
- Sign in at `/signin` with email and password.
- Tenant routes under `/t/:tenantSlug/*` require a bearer token plus matching tenant membership.
