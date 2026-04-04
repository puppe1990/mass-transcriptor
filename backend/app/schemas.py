from __future__ import annotations

from pydantic import BaseModel, EmailStr


class UserResponse(BaseModel):
    id: int
    name: str
    email: str


class TenantResponse(BaseModel):
    id: int
    slug: str
    name: str


class MembershipResponse(BaseModel):
    tenant_id: int
    user_id: int
    role: str
    tenant_slug: str


class SignUpRequest(BaseModel):
    workspace_name: str
    workspace_slug: str
    name: str
    email: EmailStr
    password: str


class SignInRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    memberships: list[MembershipResponse]
    tenant: TenantResponse | None = None


class ProviderStateResponse(BaseModel):
    enabled: bool
    has_api_key: bool


class ProviderSettingsResponse(BaseModel):
    workspace_name: str
    default_provider: str
    whisper_language: str
    providers: dict[str, ProviderStateResponse]


class ProviderSettingsUpdateRequest(BaseModel):
    workspace_name: str
    default_provider: str
    whisper_language: str = "auto"
    assemblyai_api_key: str | None = None


class JobResponse(BaseModel):
    id: int
    status: str
    provider_key: str


class JobSummaryResponse(JobResponse):
    upload_id: int
    original_filename: str
    created_at: str


class JobDetailResponse(JobResponse):
    upload_id: int
    original_filename: str
    error_message: str | None = None
    markdown_path: str | None = None
    transcript_text: str | None = None
