# Mass Transcriptor

Multi-tenant audio transcription MVP with React, FastAPI, SQLite, local storage, and asynchronous jobs.

## Local Development

1. Create a Python virtualenv in `backend/` and install the backend dependencies.
2. Run `npm install` in the repository root and in `frontend/`.
3. Start everything with `npm run dev` in the repository root.

## Notes

- Tenant scope lives in the URL path, such as `/t/acme/uploads`.
- Audio and generated Markdown files are stored under `storage/`.
- The default provider is `whisper`; `assemblyai` is enabled when `ASSEMBLYAI_API_KEY` is set.
- The API seeds a default tenant with slug `acme` on startup.
- Vite proxies `/t/*` requests to `http://127.0.0.1:8000` in local development.
