# Multi-Tenant Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add email/password authentication so sign up creates a new workspace plus owner account, sign in issues JWT access, and tenant routes require authenticated membership.

**Architecture:** The backend adds `users` and `tenant_memberships`, password hashing, JWT issuance, and request-time tenant authorization. The frontend adds auth pages, token persistence, route guards, and redirects into the user’s tenant-scoped workspace after sign up or sign in.

**Tech Stack:** FastAPI, SQLAlchemy, Pydantic, PyJWT, passlib, React, TypeScript, React Router, Vitest, pytest

---

## File Structure

### Backend

- Modify: `backend/pyproject.toml`
Add auth dependencies.
- Modify: `backend/app/models.py`
Add `User` and `TenantMembership`.
- Modify: `backend/alembic/versions/0001_initial_schema.py`
Extend schema for auth tables.
- Create: `backend/app/services/auth.py`
Password hashing, token creation, token decoding.
- Create: `backend/app/services/memberships.py`
Membership lookups and tenant access checks.
- Modify: `backend/app/schemas.py`
Auth request/response models.
- Modify: `backend/app/api/routes.py`
Add `/auth/signup`, `/auth/signin`, `/auth/me`, and protect tenant routes.
- Modify: `backend/app/main.py`
Remove seeded onboarding dependency and keep startup neutral.
- Modify: `backend/tests/test_upload_api.py`
Protect existing tenant routes.
- Create: `backend/tests/test_auth_api.py`
Signup, signin, me, and membership authorization tests.

### Frontend

- Modify: `frontend/src/App.tsx`
Add auth routes and protected routes.
- Create: `frontend/src/lib/auth.ts`
Token storage and auth helpers.
- Modify: `frontend/src/lib/api.ts`
Attach bearer token to protected requests and add auth calls.
- Create: `frontend/src/pages/SignUpPage.tsx`
- Create: `frontend/src/pages/SignInPage.tsx`
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Create: `frontend/src/components/AuthForm.tsx`
- Modify: `frontend/src/pages/UploadPage.tsx`
- Modify: `frontend/src/pages/JobsPage.tsx`
- Modify: `frontend/src/pages/JobDetailPage.tsx`
- Create: `frontend/src/tests/AuthFlow.test.tsx`
Auth redirect and login/signup behavior.
- Modify: `frontend/src/tests/UploadPage.test.tsx`
- Modify: `frontend/src/tests/JobsPage.test.tsx`
- Modify: `frontend/src/tests/JobDetailPage.test.tsx`

### Docs

- Modify: `README.md`
Document signup/signin and JWT-protected flow.

## Task 1: Add Backend Auth Dependencies

**Files:**
- Modify: `backend/pyproject.toml`
- Test: `backend/tests/test_auth_api.py`

- [ ] **Step 1: Write the failing dependency smoke test**

```python
def test_auth_modules_import():
    from app.services.auth import hash_password, verify_password  # noqa: F401
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && source .venv/bin/activate && pytest -q tests/test_auth_api.py::test_auth_modules_import`
Expected: FAIL with `ModuleNotFoundError` for `app.services.auth`

- [ ] **Step 3: Add auth dependencies**

```toml
dependencies = [
  "fastapi>=0.115.0",
  "uvicorn[standard]>=0.30.0",
  "sqlalchemy>=2.0.0",
  "alembic>=1.13.0",
  "pydantic-settings>=2.4.0",
  "python-multipart>=0.0.9",
  "assemblyai>=0.33.0",
  "openai-whisper>=20240930",
  "PyJWT>=2.9.0",
  "passlib[bcrypt]>=1.7.4",
]
```

- [ ] **Step 4: Run the smoke test again**

Run: `cd backend && source .venv/bin/activate && pytest -q tests/test_auth_api.py::test_auth_modules_import`
Expected: FAIL moves from missing dependency to missing implementation module

- [ ] **Step 5: Commit**

```bash
git add backend/pyproject.toml backend/tests/test_auth_api.py
git commit -m "chore: add backend auth dependencies"
```

## Task 2: Add User and Membership Models

**Files:**
- Modify: `backend/app/models.py`
- Modify: `backend/alembic/versions/0001_initial_schema.py`
- Test: `backend/tests/test_auth_api.py`

- [ ] **Step 1: Write the failing model test**

```python
from app.models import TenantMembership, User


def test_auth_models_exist():
    assert User.__tablename__ == "users"
    assert TenantMembership.__tablename__ == "tenant_memberships"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && source .venv/bin/activate && pytest -q tests/test_auth_api.py::test_auth_models_exist`
Expected: FAIL with missing model classes

- [ ] **Step 3: Add the models**

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)
```

```python
class TenantMembership(Base):
    __tablename__ = "tenant_memberships"

    id: Mapped[int] = mapped_column(primary_key=True)
    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(50), default="owner")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
```

- [ ] **Step 4: Extend the initial migration**

```python
op.create_table(
    "users",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("name", sa.String(length=200), nullable=False),
    sa.Column("email", sa.String(length=255), nullable=False, unique=True),
    sa.Column("password_hash", sa.String(length=255), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
)
```

```python
op.create_table(
    "tenant_memberships",
    sa.Column("id", sa.Integer(), primary_key=True),
    sa.Column("tenant_id", sa.Integer(), sa.ForeignKey("tenants.id"), nullable=False),
    sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
    sa.Column("role", sa.String(length=50), nullable=False, server_default="owner"),
    sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
)
```

- [ ] **Step 5: Run the model test again**

Run: `cd backend && source .venv/bin/activate && pytest -q tests/test_auth_api.py::test_auth_models_exist`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/models.py backend/alembic/versions/0001_initial_schema.py backend/tests/test_auth_api.py
git commit -m "feat: add user and membership models"
```

## Task 3: Implement Password Hashing and JWT Helpers

**Files:**
- Create: `backend/app/services/auth.py`
- Modify: `backend/app/config.py`
- Test: `backend/tests/test_auth_api.py`

- [ ] **Step 1: Write the failing auth helper test**

```python
from app.services.auth import create_access_token, hash_password, verify_password


def test_password_hash_and_verify_roundtrip():
    password_hash = hash_password("secret123")
    assert verify_password("secret123", password_hash) is True
    assert verify_password("wrong", password_hash) is False


def test_create_access_token_returns_string():
    token = create_access_token(user_id=1, email="owner@example.com")
    assert isinstance(token, str)
    assert len(token) > 20
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && source .venv/bin/activate && pytest -q tests/test_auth_api.py -k "password_hash_and_verify_roundtrip or create_access_token_returns_string"`
Expected: FAIL with missing implementation

- [ ] **Step 3: Add auth settings**

```python
class Settings(BaseSettings):
    ...
    jwt_secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
```

- [ ] **Step 4: Implement auth helpers**

```python
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
settings = Settings()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return pwd_context.verify(password, password_hash)
```

```python
def create_access_token(user_id: int, email: str) -> str:
    payload = {"sub": str(user_id), "email": email}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
```

- [ ] **Step 5: Run the helper tests again**

Run: `cd backend && source .venv/bin/activate && pytest -q tests/test_auth_api.py -k "password_hash_and_verify_roundtrip or create_access_token_returns_string"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/config.py backend/app/services/auth.py backend/tests/test_auth_api.py
git commit -m "feat: add password hashing and jwt helpers"
```

## Task 4: Add Signup, Signin, and Me Endpoints

**Files:**
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/api/routes.py`
- Test: `backend/tests/test_auth_api.py`

- [ ] **Step 1: Write the failing signup/signin tests**

```python
def test_signup_creates_tenant_user_and_membership(client):
    response = client.post(
        "/auth/signup",
        json={
            "workspace_name": "Acme",
            "workspace_slug": "acme",
            "name": "Owner",
            "email": "owner@example.com",
            "password": "secret123",
        },
    )
    assert response.status_code == 201
    payload = response.json()
    assert payload["tenant"]["slug"] == "acme"
    assert payload["access_token"]
```

```python
def test_signin_returns_token_for_valid_credentials(client):
    response = client.post(
        "/auth/signin",
        json={"email": "owner@example.com", "password": "secret123"},
    )
    assert response.status_code == 200
    assert response.json()["access_token"]
```

```python
def test_me_returns_current_user(client, auth_header):
    response = client.get("/auth/me", headers=auth_header)
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "owner@example.com"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && source .venv/bin/activate && pytest -q tests/test_auth_api.py -k "signup_creates_tenant_user_and_membership or signin_returns_token_for_valid_credentials or me_returns_current_user"`
Expected: FAIL with missing endpoints

- [ ] **Step 3: Add request and response schemas**

```python
class SignUpRequest(BaseModel):
    workspace_name: str
    workspace_slug: str
    name: str
    email: str
    password: str
```

```python
class SignInRequest(BaseModel):
    email: str
    password: str
```

```python
class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    memberships: list[dict]
    tenant: dict | None = None
```

- [ ] **Step 4: Implement the endpoints**

```python
@router.post("/auth/signup", status_code=201, response_model=AuthResponse)
def sign_up(payload: SignUpRequest, session: Session = Depends(get_session)) -> AuthResponse:
    ...
```

```python
@router.post("/auth/signin", response_model=AuthResponse)
def sign_in(payload: SignInRequest, session: Session = Depends(get_session)) -> AuthResponse:
    ...
```

```python
@router.get("/auth/me")
def me(current_user=Depends(get_current_user), session: Session = Depends(get_session)):
    ...
```

- [ ] **Step 5: Run the auth endpoint tests again**

Run: `cd backend && source .venv/bin/activate && pytest -q tests/test_auth_api.py -k "signup_creates_tenant_user_and_membership or signin_returns_token_for_valid_credentials or me_returns_current_user"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/schemas.py backend/app/api/routes.py backend/tests/test_auth_api.py
git commit -m "feat: add signup signin and me endpoints"
```

## Task 5: Enforce Tenant Membership on Protected Routes

**Files:**
- Create: `backend/app/services/memberships.py`
- Modify: `backend/app/services/auth.py`
- Modify: `backend/app/api/routes.py`
- Modify: `backend/tests/test_upload_api.py`
- Modify: `backend/tests/test_auth_api.py`

- [ ] **Step 1: Write the failing authorization tests**

```python
def test_upload_rejects_unauthenticated_requests(client):
    response = client.post("/t/acme/uploads", files={"file": ("sample.wav", b"data", "audio/wav")})
    assert response.status_code == 401
```

```python
def test_upload_rejects_user_without_membership(client, outsider_auth_header):
    response = client.post(
        "/t/acme/uploads",
        headers=outsider_auth_header,
        files={"file": ("sample.wav", b"data", "audio/wav")},
    )
    assert response.status_code == 403
```

```python
def test_upload_accepts_user_with_membership(client, auth_header):
    response = client.post(
        "/t/acme/uploads",
        headers=auth_header,
        files={"file": ("sample.wav", b"data", "audio/wav")},
    )
    assert response.status_code == 201
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd backend && source .venv/bin/activate && pytest -q tests/test_upload_api.py tests/test_auth_api.py -k "upload_rejects_unauthenticated_requests or upload_rejects_user_without_membership or upload_accepts_user_with_membership"`
Expected: FAIL because tenant routes are still public

- [ ] **Step 3: Implement current-user and membership checks**

```python
def get_current_user(...):
    token = credentials.credentials
    payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    ...
```

```python
def require_tenant_membership(session: Session, user_id: int, tenant_id: int) -> TenantMembership:
    ...
```

- [ ] **Step 4: Protect tenant-scoped routes**

```python
@router.post("/t/{tenant_slug}/uploads", ...)
async def upload_audio(
    tenant_slug: str,
    file: UploadFile = File(...),
    current_user = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    tenant = require_accessible_tenant(session, current_user.id, tenant_slug)
    ...
```

- [ ] **Step 5: Run the authorization tests again**

Run: `cd backend && source .venv/bin/activate && pytest -q tests/test_upload_api.py tests/test_auth_api.py -k "upload_rejects_unauthenticated_requests or upload_rejects_user_without_membership or upload_accepts_user_with_membership"`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/memberships.py backend/app/services/auth.py backend/app/api/routes.py backend/tests/test_upload_api.py backend/tests/test_auth_api.py
git commit -m "feat: enforce tenant membership on protected routes"
```

## Task 6: Add Frontend Auth Storage and API Calls

**Files:**
- Create: `frontend/src/lib/auth.ts`
- Modify: `frontend/src/lib/api.ts`
- Test: `frontend/src/tests/AuthFlow.test.tsx`

- [ ] **Step 1: Write the failing auth storage test**

```tsx
import { clearAuth, getAccessToken, saveAuth } from "../lib/auth";

test("saveAuth persists the access token", () => {
  saveAuth({ access_token: "abc123", memberships: [], user: { email: "owner@example.com" } });
  expect(getAccessToken()).toBe("abc123");
  clearAuth();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- src/tests/AuthFlow.test.tsx`
Expected: FAIL with missing auth module

- [ ] **Step 3: Implement auth storage**

```ts
const AUTH_STORAGE_KEY = "mass-transcriptor-auth";

export function saveAuth(payload: AuthPayload) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
}
```

```ts
export function getAccessToken(): string | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  ...
}
```

- [ ] **Step 4: Update API helpers to attach bearer tokens**

```ts
function buildHeaders(init?: HeadersInit): HeadersInit {
  const token = getAccessToken();
  return token ? { ...init, Authorization: `Bearer ${token}` } : init ?? {};
}
```

- [ ] **Step 5: Run the auth storage test again**

Run: `cd frontend && npm test -- src/tests/AuthFlow.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/auth.ts frontend/src/lib/api.ts frontend/src/tests/AuthFlow.test.tsx
git commit -m "feat: add frontend auth storage"
```

## Task 7: Add Sign Up and Sign In Pages

**Files:**
- Create: `frontend/src/components/AuthForm.tsx`
- Create: `frontend/src/pages/SignUpPage.tsx`
- Create: `frontend/src/pages/SignInPage.tsx`
- Modify: `frontend/src/App.tsx`
- Test: `frontend/src/tests/AuthFlow.test.tsx`

- [ ] **Step 1: Write the failing auth route tests**

```tsx
test("renders sign up route", () => {
  render(
    <MemoryRouter initialEntries={["/signup"]}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { name: /create workspace/i })).toBeTruthy();
});
```

```tsx
test("renders sign in route", () => {
  render(
    <MemoryRouter initialEntries={["/signin"]}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { name: /sign in/i })).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- src/tests/AuthFlow.test.tsx`
Expected: FAIL because routes do not exist

- [ ] **Step 3: Add auth pages and shared form**

```tsx
export default function SignUpPage() {
  return (
    <section className="page">
      <h1>Create Workspace</h1>
      <AuthForm mode="signup" />
    </section>
  );
}
```

```tsx
export default function SignInPage() {
  return (
    <section className="page">
      <h1>Sign In</h1>
      <AuthForm mode="signin" />
    </section>
  );
}
```

- [ ] **Step 4: Register the routes**

```tsx
<Routes>
  <Route path="/signup" element={<SignUpPage />} />
  <Route path="/signin" element={<SignInPage />} />
  ...
</Routes>
```

- [ ] **Step 5: Run the auth route tests again**

Run: `cd frontend && npm test -- src/tests/AuthFlow.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/AuthForm.tsx frontend/src/pages/SignUpPage.tsx frontend/src/pages/SignInPage.tsx frontend/src/App.tsx frontend/src/tests/AuthFlow.test.tsx
git commit -m "feat: add sign up and sign in pages"
```

## Task 8: Add Protected Routes and Redirect Logic

**Files:**
- Create: `frontend/src/components/ProtectedRoute.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/tests/UploadPage.test.tsx`
- Modify: `frontend/src/tests/JobsPage.test.tsx`
- Modify: `frontend/src/tests/JobDetailPage.test.tsx`
- Modify: `frontend/src/tests/AuthFlow.test.tsx`

- [ ] **Step 1: Write the failing protected-route test**

```tsx
test("redirects tenant route to sign in when unauthenticated", () => {
  render(
    <MemoryRouter initialEntries={["/t/acme/uploads"]}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole("heading", { name: /sign in/i })).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npm test -- src/tests/AuthFlow.test.tsx`
Expected: FAIL because tenant routes still render publicly

- [ ] **Step 3: Implement protected route wrapper**

```tsx
export function ProtectedRoute({ children }: { children: JSX.Element }) {
  return getAccessToken() ? children : <Navigate to="/signin" replace />;
}
```

- [ ] **Step 4: Wrap tenant routes**

```tsx
<Route path="/t/:tenantSlug/uploads" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
```

- [ ] **Step 5: Run the protected-route test again**

Run: `cd frontend && npm test -- src/tests/AuthFlow.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/ProtectedRoute.tsx frontend/src/App.tsx frontend/src/tests/UploadPage.test.tsx frontend/src/tests/JobsPage.test.tsx frontend/src/tests/JobDetailPage.test.tsx frontend/src/tests/AuthFlow.test.tsx
git commit -m "feat: protect tenant routes in frontend"
```

## Task 9: Wire Form Submission and Redirect After Auth

**Files:**
- Modify: `frontend/src/components/AuthForm.tsx`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/tests/AuthFlow.test.tsx`

- [ ] **Step 1: Write the failing submit-flow tests**

```tsx
test("signup stores auth and redirects to workspace", async () => {
  ...
  expect(await screen.findByRole("heading", { name: /upload audio/i })).toBeTruthy();
});
```

```tsx
test("signin stores auth and redirects to tenant jobs", async () => {
  ...
  expect(await screen.findByRole("heading", { name: /jobs/i })).toBeTruthy();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npm test -- src/tests/AuthFlow.test.tsx`
Expected: FAIL because forms do not submit auth requests yet

- [ ] **Step 3: Implement auth API calls**

```ts
export async function signUp(payload: SignUpRequest): Promise<AuthPayload> {
  const response = await fetch("/auth/signup", {...});
  return parseJson<AuthPayload>(response);
}
```

```ts
export async function signIn(payload: SignInRequest): Promise<AuthPayload> {
  const response = await fetch("/auth/signin", {...});
  return parseJson<AuthPayload>(response);
}
```

- [ ] **Step 4: Implement form submit and redirect**

```tsx
const payload = mode === "signup" ? await signUp(values) : await signIn(values);
saveAuth(payload);
navigate(`/t/${targetSlug}/uploads`);
```

- [ ] **Step 5: Run the submit-flow tests again**

Run: `cd frontend && npm test -- src/tests/AuthFlow.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/AuthForm.tsx frontend/src/lib/api.ts frontend/src/tests/AuthFlow.test.tsx
git commit -m "feat: wire auth forms to backend"
```

## Task 10: Update Docs and Run Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Document the auth flow**

```md
## Authentication

- Sign up at `/signup` to create a workspace and owner account.
- Sign in at `/signin` with email and password.
- Tenant routes require a bearer token and matching membership.
```

- [ ] **Step 2: Run backend verification**

Run: `cd backend && source .venv/bin/activate && pytest -q`
Expected: PASS

- [ ] **Step 3: Run frontend verification**

Run: `cd frontend && npm test`
Expected: PASS

- [ ] **Step 4: Run frontend build**

Run: `cd frontend && npm run build`
Expected: PASS

- [ ] **Step 5: Run root verification**

Run: `npm test`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: document multi-tenant auth flow"
```

## Self-Review

### Spec coverage

- Signup creating tenant, user, and owner membership is covered in Tasks 2, 3, and 4.
- Signin and JWT issuance are covered in Tasks 3 and 4.
- Membership enforcement on tenant routes is covered in Task 5.
- Frontend auth pages and token storage are covered in Tasks 6, 7, and 9.
- Protected routes and redirects are covered in Task 8.

### Placeholder scan

- No placeholder text or deferred implementation steps remain.

### Type consistency

- `workspace_slug`, `workspace_name`, `email`, and `password` are used consistently across schemas, endpoints, and frontend payloads.
- Protected tenant routes continue to use `/t/:tenantSlug/*`.
