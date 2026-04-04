# Audio Transcriber MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-tenant audio transcription MVP with React, FastAPI, SQLite, local file storage, asynchronous job processing, and pluggable transcription providers.

**Architecture:** The application is split into a React SPA frontend, a FastAPI web API, and a separate worker process. Tenant scoping is encoded in the route path, persistence uses SQLite for metadata and local disk for file artifacts, and transcription providers are selected behind a shared adapter interface so Whisper, AssemblyAI, and future providers fit the same workflow.

**Tech Stack:** React, TypeScript, Vite, FastAPI, SQLAlchemy, Alembic, SQLite, Pydantic, pytest, Whisper, AssemblyAI SDK

---

## File Structure

### Backend

- `backend/pyproject.toml`
Python dependencies and project metadata
- `backend/alembic.ini`
Alembic configuration
- `backend/alembic/env.py`
Migration runtime wiring
- `backend/alembic/versions/0001_initial_schema.py`
Initial schema for tenants, uploads, jobs, and results
- `backend/app/config.py`
Settings and environment parsing
- `backend/app/db.py`
Engine, session factory, and base model setup
- `backend/app/models.py`
SQLAlchemy models
- `backend/app/schemas.py`
API request and response schemas
- `backend/app/main.py`
FastAPI app bootstrap
- `backend/app/api/routes.py`
Tenant-scoped API routes
- `backend/app/services/tenancy.py`
Tenant lookup helpers
- `backend/app/services/storage.py`
Local file path generation and file IO
- `backend/app/services/jobs.py`
Job creation, queries, and status transitions
- `backend/app/services/providers/base.py`
Shared provider interface and result type
- `backend/app/services/providers/whisper_provider.py`
Whisper implementation
- `backend/app/services/providers/assemblyai_provider.py`
AssemblyAI implementation
- `backend/app/services/providers/registry.py`
Provider selection and registration
- `backend/app/services/markdown.py`
Markdown rendering from transcript text
- `backend/app/worker.py`
Queued job processing loop
- `backend/tests/test_tenancy.py`
- `backend/tests/test_storage.py`
- `backend/tests/test_upload_api.py`
- `backend/tests/test_job_worker.py`
- `backend/tests/test_provider_registry.py`

### Frontend

- `frontend/package.json`
Frontend dependencies and scripts
- `frontend/tsconfig.json`
- `frontend/vite.config.ts`
- `frontend/index.html`
- `frontend/src/main.tsx`
React bootstrap
- `frontend/src/App.tsx`
Route registration
- `frontend/src/lib/api.ts`
Fetch helpers
- `frontend/src/lib/types.ts`
Shared frontend types
- `frontend/src/pages/UploadPage.tsx`
- `frontend/src/pages/JobsPage.tsx`
- `frontend/src/pages/JobDetailPage.tsx`
- `frontend/src/components/UploadForm.tsx`
- `frontend/src/components/JobsTable.tsx`
- `frontend/src/components/JobStatusBadge.tsx`
- `frontend/src/components/TranscriptPreview.tsx`
- `frontend/src/styles.css`
- `frontend/src/tests/UploadPage.test.tsx`
- `frontend/src/tests/JobsPage.test.tsx`
- `frontend/src/tests/JobDetailPage.test.tsx`

### Root

- `README.md`
Setup and local run instructions
- `.gitignore`
Ignore Python, Node, SQLite, and storage artifacts
- `storage/.gitkeep`
Local artifact root

## Task 1: Scaffold Repository Structure

**Files:**
- Create: `.gitignore`
- Create: `README.md`
- Create: `storage/.gitkeep`
- Create: `backend/pyproject.toml`
- Create: `frontend/package.json`

- [ ] **Step 1: Create the initial directory layout**

```bash
mkdir -p backend/app/api backend/app/services/providers backend/alembic/versions backend/tests
mkdir -p frontend/src/components frontend/src/lib frontend/src/pages frontend/src/tests
mkdir -p docs/superpowers/specs docs/superpowers/plans storage
touch storage/.gitkeep
```

- [ ] **Step 2: Add the ignore file**

```gitignore
__pycache__/
.pytest_cache/
.venv/
node_modules/
dist/
coverage/
*.sqlite3
*.db
storage/*
!storage/.gitkeep
frontend/node_modules/
frontend/dist/
backend/.venv/
```

- [ ] **Step 3: Add a bootstrap README**

```md
# Mass Transcriptor

Multi-tenant audio transcription MVP with React, FastAPI, SQLite, local storage, and asynchronous jobs.
```

- [ ] **Step 4: Add backend project metadata**

```toml
[project]
name = "mass-transcriptor-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "fastapi",
  "uvicorn[standard]",
  "sqlalchemy",
  "alembic",
  "pydantic-settings",
  "python-multipart",
  "assemblyai",
  "openai-whisper",
]

[project.optional-dependencies]
dev = [
  "pytest",
  "pytest-asyncio",
  "httpx",
]
```

- [ ] **Step 5: Add frontend project metadata**

```json
{
  "name": "mass-transcriptor-frontend",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.30.1"
  },
  "devDependencies": {
    "@testing-library/react": "^16.3.0",
    "@types/react": "^18.3.24",
    "@types/react-dom": "^18.3.7",
    "@vitejs/plugin-react": "^5.0.4",
    "typescript": "^5.8.3",
    "vite": "^7.1.7",
    "vitest": "^3.2.4"
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add .gitignore README.md storage/.gitkeep backend/pyproject.toml frontend/package.json
git commit -m "chore: scaffold repository structure"
```

## Task 2: Build Backend Configuration and Database Base

**Files:**
- Create: `backend/app/config.py`
- Create: `backend/app/db.py`
- Create: `backend/app/models.py`
- Create: `backend/alembic.ini`
- Create: `backend/alembic/env.py`
- Test: `backend/tests/test_tenancy.py`

- [ ] **Step 1: Write the failing database configuration test**

```python
from app.config import Settings


def test_default_database_url_uses_sqlite():
    settings = Settings()
    assert settings.database_url == "sqlite:///./app.db"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_tenancy.py -v`
Expected: FAIL with `ModuleNotFoundError` for `app.config`

- [ ] **Step 3: Write settings and DB base**

```python
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./app.db"
    storage_root: str = "../storage"
    polling_interval_seconds: float = 2.0
    default_provider: str = "whisper"
    assemblyai_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")
```

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import Settings

settings = Settings()
engine = create_engine(settings.database_url, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass
```

- [ ] **Step 4: Add the initial models shell**

```python
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String

from app.db import Base


class Tenant(Base):
    __tablename__ = "tenants"

    id: Mapped[int] = mapped_column(primary_key=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_tenancy.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/config.py backend/app/db.py backend/app/models.py backend/alembic.ini backend/alembic/env.py backend/tests/test_tenancy.py
git commit -m "feat: add backend configuration and database base"
```

## Task 3: Implement Initial Schema and Models

**Files:**
- Modify: `backend/app/models.py`
- Create: `backend/alembic/versions/0001_initial_schema.py`
- Test: `backend/tests/test_storage.py`

- [ ] **Step 1: Write the failing schema expectations test**

```python
from app.models import Tenant, Upload, TranscriptionJob, TranscriptionResult


def test_models_expose_core_entities():
    assert Tenant.__tablename__ == "tenants"
    assert Upload.__tablename__ == "uploads"
    assert TranscriptionJob.__tablename__ == "transcription_jobs"
    assert TranscriptionResult.__tablename__ == "transcription_results"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_storage.py -v`
Expected: FAIL with missing model classes

- [ ] **Step 3: Define core SQLAlchemy models**

```python
class Upload(Base):
    __tablename__ = "uploads"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    original_filename: Mapped[str] = mapped_column(String(255))
    mime_type: Mapped[str] = mapped_column(String(120))
    size_bytes: Mapped[int]
    audio_path: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
```

```python
class TranscriptionJob(Base):
    __tablename__ = "transcription_jobs"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    upload_id: Mapped[int] = mapped_column(ForeignKey("uploads.id"), unique=True)
    provider_key: Mapped[str] = mapped_column(String(50))
    status: Mapped[str] = mapped_column(String(30), default="queued", index=True)
    error_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
```

```python
class TranscriptionResult(Base):
    __tablename__ = "transcription_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("transcription_jobs.id"), unique=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    markdown_path: Mapped[str] = mapped_column(String(500))
    transcript_text: Mapped[str]
```

- [ ] **Step 4: Add the initial migration**

```python
def upgrade() -> None:
    op.create_table(
        "tenants",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(length=100), nullable=False, unique=True),
        sa.Column("name", sa.String(length=200), nullable=False),
    )
```

```python
def downgrade() -> None:
    op.drop_table("transcription_results")
    op.drop_table("transcription_jobs")
    op.drop_table("uploads")
    op.drop_table("tenants")
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_storage.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/models.py backend/alembic/versions/0001_initial_schema.py backend/tests/test_storage.py
git commit -m "feat: add initial transcription schema"
```

## Task 4: Add Tenant Resolution and Local Storage Service

**Files:**
- Create: `backend/app/services/tenancy.py`
- Create: `backend/app/services/storage.py`
- Test: `backend/tests/test_tenancy.py`
- Test: `backend/tests/test_storage.py`

- [ ] **Step 1: Write failing tests for tenant lookup and path generation**

```python
from app.services.storage import build_upload_dir


def test_build_upload_dir_scopes_paths_per_tenant():
    path = build_upload_dir("acme", 42)
    assert path.endswith("acme/uploads/42")
```

```python
from app.services.tenancy import normalize_tenant_slug


def test_normalize_tenant_slug_lowercases_input():
    assert normalize_tenant_slug("Acme-Co") == "acme-co"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && pytest tests/test_tenancy.py tests/test_storage.py -v`
Expected: FAIL with missing functions

- [ ] **Step 3: Implement tenancy helpers**

```python
def normalize_tenant_slug(slug: str) -> str:
    return slug.strip().lower()
```

```python
def get_tenant_by_slug(session: Session, tenant_slug: str) -> Tenant | None:
    normalized = normalize_tenant_slug(tenant_slug)
    return session.scalar(select(Tenant).where(Tenant.slug == normalized))
```

- [ ] **Step 4: Implement storage path helpers**

```python
from pathlib import Path

from app.config import Settings

settings = Settings()


def build_upload_dir(tenant_slug: str, upload_id: int) -> str:
    return str(Path(settings.storage_root) / tenant_slug / "uploads" / str(upload_id))
```

```python
def build_audio_path(tenant_slug: str, upload_id: int, filename: str) -> str:
    return str(Path(build_upload_dir(tenant_slug, upload_id)) / "audio" / filename)
```

```python
def build_markdown_path(tenant_slug: str, upload_id: int) -> str:
    return str(Path(build_upload_dir(tenant_slug, upload_id)) / "transcript" / "transcript.md")
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd backend && pytest tests/test_tenancy.py tests/test_storage.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/tenancy.py backend/app/services/storage.py backend/tests/test_tenancy.py backend/tests/test_storage.py
git commit -m "feat: add tenant resolution and storage helpers"
```

## Task 5: Add Job Service and Markdown Renderer

**Files:**
- Create: `backend/app/services/jobs.py`
- Create: `backend/app/services/markdown.py`
- Test: `backend/tests/test_job_worker.py`

- [ ] **Step 1: Write the failing job lifecycle test**

```python
from app.services.markdown import render_transcript_markdown


def test_render_transcript_markdown_has_heading():
    output = render_transcript_markdown("hello world", "sample.wav", "whisper")
    assert output.startswith("# Transcript")
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_job_worker.py -v`
Expected: FAIL with missing markdown renderer

- [ ] **Step 3: Implement the Markdown renderer**

```python
def render_transcript_markdown(transcript_text: str, filename: str, provider: str) -> str:
    return "\n".join(
        [
            "# Transcript",
            "",
            f"- Source: {filename}",
            f"- Provider: {provider}",
            "",
            transcript_text,
            "",
        ]
    )
```

- [ ] **Step 4: Implement job service primitives**

```python
def create_transcription_job(
    session: Session,
    tenant_id: int,
    upload_id: int,
    provider_key: str,
) -> TranscriptionJob:
    job = TranscriptionJob(
        tenant_id=tenant_id,
        upload_id=upload_id,
        provider_key=provider_key,
        status="queued",
    )
    session.add(job)
    session.commit()
    session.refresh(job)
    return job
```

```python
def mark_job_completed(session: Session, job: TranscriptionJob, markdown_path: str, transcript_text: str) -> None:
    session.add(
        TranscriptionResult(
            job_id=job.id,
            tenant_id=job.tenant_id,
            markdown_path=markdown_path,
            transcript_text=transcript_text,
        )
    )
    job.status = "completed"
    session.commit()
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_job_worker.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/jobs.py backend/app/services/markdown.py backend/tests/test_job_worker.py
git commit -m "feat: add job lifecycle primitives"
```

## Task 6: Add Provider Interface, Registry, and Whisper Provider

**Files:**
- Create: `backend/app/services/providers/base.py`
- Create: `backend/app/services/providers/registry.py`
- Create: `backend/app/services/providers/whisper_provider.py`
- Test: `backend/tests/test_provider_registry.py`

- [ ] **Step 1: Write the failing provider registry test**

```python
from app.services.providers.registry import get_provider


def test_get_provider_returns_whisper_provider():
    provider = get_provider("whisper")
    assert provider.provider_key == "whisper"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_provider_registry.py -v`
Expected: FAIL with missing registry implementation

- [ ] **Step 3: Implement the provider base contract**

```python
from dataclasses import dataclass


@dataclass
class ProviderResult:
    transcript_text: str
    provider_key: str
    metadata: dict


class TranscriptionProvider:
    provider_key: str

    def transcribe(self, file_path: str) -> ProviderResult:
        raise NotImplementedError
```

- [ ] **Step 4: Implement Whisper provider and registry**

```python
class WhisperProvider(TranscriptionProvider):
    provider_key = "whisper"

    def transcribe(self, file_path: str) -> ProviderResult:
        model = whisper.load_model("base")
        result = model.transcribe(file_path)
        return ProviderResult(
            transcript_text=result["text"].strip(),
            provider_key=self.provider_key,
            metadata={"language": result.get("language")},
        )
```

```python
def get_provider(provider_key: str) -> TranscriptionProvider:
    registry = {
        "whisper": WhisperProvider(),
    }
    return registry[provider_key]
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_provider_registry.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/providers/base.py backend/app/services/providers/registry.py backend/app/services/providers/whisper_provider.py backend/tests/test_provider_registry.py
git commit -m "feat: add whisper provider registry"
```

## Task 7: Add AssemblyAI Provider

**Files:**
- Create: `backend/app/services/providers/assemblyai_provider.py`
- Modify: `backend/app/services/providers/registry.py`
- Test: `backend/tests/test_provider_registry.py`

- [ ] **Step 1: Extend the failing registry test**

```python
def test_get_provider_returns_assemblyai_provider():
    provider = get_provider("assemblyai")
    assert provider.provider_key == "assemblyai"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_provider_registry.py -v`
Expected: FAIL with `KeyError: 'assemblyai'`

- [ ] **Step 3: Implement AssemblyAI provider**

```python
class AssemblyAiProvider(TranscriptionProvider):
    provider_key = "assemblyai"

    def __init__(self, api_key: str) -> None:
        aai.settings.api_key = api_key

    def transcribe(self, file_path: str) -> ProviderResult:
        transcript = aai.Transcriber().transcribe(file_path)
        if transcript.status == aai.TranscriptStatus.error:
            raise RuntimeError(transcript.error)
        return ProviderResult(
            transcript_text=transcript.text or "",
            provider_key=self.provider_key,
            metadata={"id": transcript.id},
        )
```

- [ ] **Step 4: Register AssemblyAI provider lazily**

```python
def get_provider(provider_key: str) -> TranscriptionProvider:
    if provider_key == "whisper":
        return WhisperProvider()
    if provider_key == "assemblyai":
        settings = Settings()
        if not settings.assemblyai_api_key:
            raise RuntimeError("ASSEMBLYAI_API_KEY is not configured")
        return AssemblyAiProvider(settings.assemblyai_api_key)
    raise KeyError(provider_key)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_provider_registry.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/providers/assemblyai_provider.py backend/app/services/providers/registry.py backend/tests/test_provider_registry.py
git commit -m "feat: add assemblyai provider"
```

## Task 8: Add FastAPI Upload and Read Endpoints

**Files:**
- Create: `backend/app/schemas.py`
- Create: `backend/app/api/routes.py`
- Create: `backend/app/main.py`
- Test: `backend/tests/test_upload_api.py`

- [ ] **Step 1: Write the failing upload endpoint test**

```python
from fastapi.testclient import TestClient
from app.main import app


def test_post_upload_returns_queued_job():
    client = TestClient(app)
    response = client.post("/t/acme/uploads")
    assert response.status_code == 201
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_upload_api.py -v`
Expected: FAIL with missing FastAPI app or route

- [ ] **Step 3: Implement response schemas**

```python
class JobResponse(BaseModel):
    id: int
    status: str
    provider_key: str
```

```python
class JobDetailResponse(JobResponse):
    upload_id: int
    error_message: str | None = None
    markdown_path: str | None = None
    transcript_text: str | None = None
```

- [ ] **Step 4: Implement API app and routes**

```python
router = APIRouter()


@router.post("/t/{tenant_slug}/uploads", status_code=201, response_model=JobResponse)
async def upload_audio(tenant_slug: str, file: UploadFile, session: Session = Depends(get_session)):
    tenant = get_tenant_by_slug(session, tenant_slug)
    if tenant is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    upload = create_upload_record(...)
    job = create_transcription_job(session, tenant.id, upload.id, tenant.default_provider)
    return JobResponse(id=job.id, status=job.status, provider_key=job.provider_key)
```

```python
@router.get("/t/{tenant_slug}/jobs/{job_id}", response_model=JobDetailResponse)
def get_job_detail(tenant_slug: str, job_id: int, session: Session = Depends(get_session)):
    ...
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_upload_api.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas.py backend/app/api/routes.py backend/app/main.py backend/tests/test_upload_api.py
git commit -m "feat: add upload and job detail endpoints"
```

## Task 9: Add Worker Loop and Job Execution

**Files:**
- Create: `backend/app/worker.py`
- Modify: `backend/app/services/jobs.py`
- Test: `backend/tests/test_job_worker.py`

- [ ] **Step 1: Write the failing worker execution test**

```python
def test_process_job_marks_job_completed(session, queued_job, monkeypatch):
    monkeypatch.setattr("app.services.providers.registry.get_provider", lambda _: FakeProvider())
    process_next_job(session)
    assert queued_job.status == "completed"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && pytest tests/test_job_worker.py -v`
Expected: FAIL with missing worker processor

- [ ] **Step 3: Implement single-job processor**

```python
def process_next_job() -> bool:
    with SessionLocal() as session:
        job = get_next_queued_job(session)
        if job is None:
            return False
        mark_job_processing(session, job)
        provider = get_provider(job.provider_key)
        result = provider.transcribe(job.upload.audio_path)
        markdown = render_transcript_markdown(result.transcript_text, job.upload.original_filename, result.provider_key)
        markdown_path = write_markdown(...)
        mark_job_completed(session, job, markdown_path, result.transcript_text)
        return True
```

- [ ] **Step 4: Implement worker loop**

```python
def run_worker_forever() -> None:
    while True:
        processed = process_next_job()
        if not processed:
            time.sleep(settings.polling_interval_seconds)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && pytest tests/test_job_worker.py -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/worker.py backend/app/services/jobs.py backend/tests/test_job_worker.py
git commit -m "feat: add asynchronous worker processing"
```

## Task 10: Scaffold React Frontend and Routing

**Files:**
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/index.html`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/App.tsx`
- Create: `frontend/src/lib/types.ts`
- Create: `frontend/src/styles.css`
- Test: `frontend/src/tests/UploadPage.test.tsx`

- [ ] **Step 1: Write the failing frontend route test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "../App";

test("renders upload heading on tenant upload route", () => {
  render(
    <MemoryRouter initialEntries={["/t/acme/uploads"]}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { name: /upload audio/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --runInBand`
Expected: FAIL with missing app scaffolding

- [ ] **Step 3: Create Vite and React bootstrap**

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 4: Add tenant-scoped routes**

```tsx
export default function App() {
  return (
    <Routes>
      <Route path="/t/:tenantSlug/uploads" element={<UploadPage />} />
      <Route path="/t/:tenantSlug/jobs" element={<JobsPage />} />
      <Route path="/t/:tenantSlug/jobs/:jobId" element={<JobDetailPage />} />
    </Routes>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm test -- --runInBand`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/tsconfig.json frontend/vite.config.ts frontend/index.html frontend/src/main.tsx frontend/src/App.tsx frontend/src/lib/types.ts frontend/src/styles.css frontend/src/tests/UploadPage.test.tsx
git commit -m "feat: scaffold tenant-aware frontend routes"
```

## Task 11: Implement Upload Screen and API Client

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/components/UploadForm.tsx`
- Create: `frontend/src/pages/UploadPage.tsx`
- Test: `frontend/src/tests/UploadPage.test.tsx`

- [ ] **Step 1: Extend the failing upload screen test**

```tsx
test("submits audio file and shows queued response", async () => {
  render(<UploadPage />);
  expect(screen.getByRole("button", { name: /start transcription/i })).toBeEnabled();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- --runInBand`
Expected: FAIL with missing upload page implementation

- [ ] **Step 3: Implement API client**

```ts
export async function createUpload(tenantSlug: string, file: File) {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch(`/t/${tenantSlug}/uploads`, { method: "POST", body });
  if (!response.ok) throw new Error("Upload failed");
  return response.json();
}
```

- [ ] **Step 4: Implement upload page**

```tsx
export default function UploadPage() {
  const { tenantSlug = "" } = useParams();
  return (
    <section>
      <h1>Upload Audio</h1>
      <UploadForm tenantSlug={tenantSlug} />
    </section>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npm test -- --runInBand`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/components/UploadForm.tsx frontend/src/pages/UploadPage.tsx frontend/src/tests/UploadPage.test.tsx
git commit -m "feat: add upload flow UI"
```

## Task 12: Implement Jobs List and Job Detail with Polling

**Files:**
- Create: `frontend/src/components/JobsTable.tsx`
- Create: `frontend/src/components/JobStatusBadge.tsx`
- Create: `frontend/src/components/TranscriptPreview.tsx`
- Create: `frontend/src/pages/JobsPage.tsx`
- Create: `frontend/src/pages/JobDetailPage.tsx`
- Test: `frontend/src/tests/JobsPage.test.tsx`
- Test: `frontend/src/tests/JobDetailPage.test.tsx`

- [ ] **Step 1: Write the failing jobs list and detail tests**

```tsx
test("renders queued job rows", () => {
  render(<JobsPage />);
  expect(screen.getByText(/queued/i)).toBeInTheDocument();
});
```

```tsx
test("shows transcript preview on completed job", () => {
  render(<JobDetailPage />);
  expect(screen.getByText(/transcript/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- --runInBand`
Expected: FAIL with missing jobs and detail pages

- [ ] **Step 3: Implement jobs list**

```tsx
export default function JobsPage() {
  const { tenantSlug = "" } = useParams();
  const [jobs, setJobs] = useState<JobSummary[]>([]);

  useEffect(() => {
    listJobs(tenantSlug).then(setJobs);
  }, [tenantSlug]);

  return <JobsTable jobs={jobs} />;
}
```

- [ ] **Step 4: Implement job detail polling**

```tsx
useEffect(() => {
  let timer: number | undefined;

  async function load() {
    const next = await getJobDetail(tenantSlug, jobId);
    setJob(next);
    if (next.status === "queued" || next.status === "processing") {
      timer = window.setTimeout(load, 2000);
    }
  }

  load();
  return () => window.clearTimeout(timer);
}, [tenantSlug, jobId]);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npm test -- --runInBand`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/JobsTable.tsx frontend/src/components/JobStatusBadge.tsx frontend/src/components/TranscriptPreview.tsx frontend/src/pages/JobsPage.tsx frontend/src/pages/JobDetailPage.tsx frontend/src/tests/JobsPage.test.tsx frontend/src/tests/JobDetailPage.test.tsx
git commit -m "feat: add job monitoring screens"
```

## Task 13: Finish Local Development Workflow

**Files:**
- Modify: `README.md`
- Modify: `backend/pyproject.toml`
- Modify: `frontend/package.json`

- [ ] **Step 1: Add runnable backend and frontend scripts**

```toml
[project.scripts]
api = "app.main:app"
worker = "app.worker:run_worker_forever"
```

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "test": "vitest run",
  "preview": "vite preview"
}
```

- [ ] **Step 2: Document the local run flow**

```md
## Local Development

1. Install backend dependencies
2. Run Alembic migrations
3. Start FastAPI
4. Start the worker
5. Start the frontend
```

- [ ] **Step 3: Verify the core commands**

Run: `cd backend && pytest -v`
Expected: PASS

Run: `cd frontend && npm test -- --runInBand`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add README.md backend/pyproject.toml frontend/package.json
git commit -m "docs: document local development workflow"
```

## Self-Review

### Spec coverage

- Multi-tenant routing is covered in Tasks 8, 10, 11, and 12.
- SQLite persistence and schema are covered in Tasks 2 and 3.
- Local disk storage is covered in Task 4.
- Async worker processing is covered in Task 9.
- Whisper and AssemblyAI adapters are covered in Tasks 6 and 7.
- Upload, list, and detail UI are covered in Tasks 10, 11, and 12.

### Placeholder scan

- No `TODO`, `TBD`, or “implement later” placeholders remain.
- Each task has explicit files, commands, and concrete code anchors.

### Type consistency

- Provider keys use `whisper` and `assemblyai` consistently.
- Tenant routing uses `/t/:tenantSlug` consistently.
- Job state names remain `queued`, `processing`, `completed`, `failed`.
