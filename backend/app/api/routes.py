from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import Settings
from app.db import get_session
from app.models import Tenant, TenantMembership, User
from app.schemas import (
    AuthResponse,
    JobDetailResponse,
    JobResponse,
    JobSummaryResponse,
    MembershipResponse,
    ProviderSettingsResponse,
    ProviderSettingsUpdateRequest,
    SignInRequest,
    SignUpRequest,
    TenantResponse,
    UserResponse,
)
from app.services.auth import create_access_token, get_current_user, hash_password, verify_password
from app.services.jobs import (
    create_transcription_job,
    create_upload_record,
    get_job_for_tenant,
    get_result_for_job,
    list_jobs_for_tenant,
    retry_job,
    update_upload_audio_path,
)
from app.services.memberships import get_memberships_for_user, require_accessible_tenant
from app.services.provider_settings import serialize_provider_settings, update_provider_settings
from app.services.storage import write_audio_bytes

router = APIRouter()
settings = Settings()


def serialize_auth_response(
    user: User,
    memberships: list[TenantMembership],
    token: str,
    tenant: Tenant | None = None,
) -> AuthResponse:
    return AuthResponse(
        access_token=token,
        user=UserResponse(id=user.id, name=user.name, email=user.email),
        memberships=[
            MembershipResponse(
                tenant_id=item.tenant_id,
                user_id=item.user_id,
                role=item.role,
                tenant_slug=item.tenant.slug,
            )
            for item in memberships
        ],
        tenant=TenantResponse(id=tenant.id, slug=tenant.slug, name=tenant.name) if tenant else None,
    )


@router.post("/auth/signup", status_code=status.HTTP_201_CREATED, response_model=AuthResponse)
def sign_up(payload: SignUpRequest, session: Session = Depends(get_session)) -> AuthResponse:
    existing_user = session.scalar(select(User).where(User.email == payload.email))
    if existing_user is not None:
        raise HTTPException(status_code=409, detail="Email already in use")

    existing_tenant = session.scalar(
        select(Tenant).where(Tenant.slug == payload.workspace_slug.lower())
    )
    if existing_tenant is not None:
        raise HTTPException(status_code=409, detail="Workspace slug already in use")

    tenant = Tenant(
        slug=payload.workspace_slug.lower(),
        name=payload.workspace_name,
        default_provider=settings.default_provider,
    )
    user = User(
        name=payload.name, email=payload.email, password_hash=hash_password(payload.password)
    )
    session.add(tenant)
    session.add(user)
    session.commit()
    session.refresh(tenant)
    session.refresh(user)

    membership = TenantMembership(tenant_id=tenant.id, user_id=user.id, role="owner")
    session.add(membership)
    session.commit()
    memberships = get_memberships_for_user(session, user.id)
    token = create_access_token(user_id=user.id, email=user.email)
    return serialize_auth_response(user, memberships, token, tenant)


@router.post("/auth/signin", response_model=AuthResponse)
def sign_in(payload: SignInRequest, session: Session = Depends(get_session)) -> AuthResponse:
    user = session.scalar(select(User).where(User.email == payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    memberships = get_memberships_for_user(session, user.id)
    token = create_access_token(user_id=user.id, email=user.email)
    return serialize_auth_response(user, memberships, token)


@router.get("/auth/me", response_model=AuthResponse)
def me(
    current_user: User = Depends(get_current_user), session: Session = Depends(get_session)
) -> AuthResponse:
    memberships = get_memberships_for_user(session, current_user.id)
    token = create_access_token(user_id=current_user.id, email=current_user.email)
    return serialize_auth_response(current_user, memberships, token)


@router.get("/t/{tenant_slug}/settings/providers", response_model=ProviderSettingsResponse)
def get_provider_settings(
    tenant_slug: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProviderSettingsResponse:
    tenant = require_accessible_tenant(session, current_user.id, tenant_slug)
    return ProviderSettingsResponse(**serialize_provider_settings(session, tenant))


@router.patch("/t/{tenant_slug}/settings/providers", response_model=ProviderSettingsResponse)
def patch_provider_settings(
    tenant_slug: str,
    payload: ProviderSettingsUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> ProviderSettingsResponse:
    tenant = require_accessible_tenant(session, current_user.id, tenant_slug)
    return ProviderSettingsResponse(
        **update_provider_settings(
            session,
            tenant,
            payload.workspace_name,
            payload.default_provider,
            payload.assemblyai_api_key,
        )
    )


@router.post(
    "/t/{tenant_slug}/uploads", status_code=status.HTTP_201_CREATED, response_model=JobResponse
)
async def upload_audio(
    tenant_slug: str,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> JobResponse:
    tenant = require_accessible_tenant(session, current_user.id, tenant_slug)

    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Empty file")

    upload = create_upload_record(
        session=session,
        tenant_id=tenant.id,
        original_filename=file.filename or "audio.bin",
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(contents),
        audio_path="pending",
    )
    audio_path = write_audio_bytes(
        tenant.slug, upload.id, Path(upload.original_filename).name, contents
    )
    update_upload_audio_path(session, upload, audio_path)
    provider_key = tenant.default_provider or settings.default_provider
    job = create_transcription_job(session, tenant.id, upload.id, provider_key)
    return JobResponse(id=job.id, status=job.status, provider_key=job.provider_key)


@router.get("/t/{tenant_slug}/jobs", response_model=list[JobSummaryResponse])
def list_jobs(
    tenant_slug: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> list[JobSummaryResponse]:
    tenant = require_accessible_tenant(session, current_user.id, tenant_slug)
    jobs = list_jobs_for_tenant(session, tenant.id)
    return [
        JobSummaryResponse(
            id=job.id,
            status=job.status,
            provider_key=job.provider_key,
            upload_id=job.upload_id,
            original_filename=job.upload.original_filename,
            created_at=job.created_at.isoformat(),
        )
        for job in jobs
    ]


@router.get("/t/{tenant_slug}/jobs/{job_id}", response_model=JobDetailResponse)
def get_job_detail(
    tenant_slug: str,
    job_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> JobDetailResponse:
    tenant = require_accessible_tenant(session, current_user.id, tenant_slug)
    job = get_job_for_tenant(session, tenant.id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    result = get_result_for_job(session, job.id)
    return JobDetailResponse(
        id=job.id,
        status=job.status,
        provider_key=job.provider_key,
        upload_id=job.upload_id,
        original_filename=job.upload.original_filename,
        error_message=job.error_message,
        markdown_path=result.markdown_path if result else None,
        transcript_text=result.transcript_text if result else None,
    )


@router.post("/t/{tenant_slug}/jobs/{job_id}/retry", response_model=JobResponse)
def retry_failed_job(
    tenant_slug: str,
    job_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> JobResponse:
    tenant = require_accessible_tenant(session, current_user.id, tenant_slug)
    job = get_job_for_tenant(session, tenant.id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status != "failed":
        raise HTTPException(status_code=409, detail="Only failed jobs can be retried")
    retried = retry_job(session, job)
    return JobResponse(id=retried.id, status=retried.status, provider_key=retried.provider_key)


@router.get("/t/{tenant_slug}/jobs/{job_id}/download")
def download_markdown(
    tenant_slug: str,
    job_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
) -> FileResponse:
    tenant = require_accessible_tenant(session, current_user.id, tenant_slug)
    job = get_job_for_tenant(session, tenant.id, job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    result = get_result_for_job(session, job.id)
    if result is None or not Path(result.markdown_path).exists():
        raise HTTPException(status_code=404, detail="Transcript file not found")
    return FileResponse(
        result.markdown_path,
        media_type="text/markdown",
        filename=f"{Path(job.upload.original_filename).stem}.md",
    )
