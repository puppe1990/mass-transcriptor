# Multi-Tenant Auth Design

**Date:** 2026-04-03

## Goal

Add multi-tenant authentication with email and password so a new user can sign up, create a new tenant/workspace, sign in later, and access only the tenant data they belong to.

## Scope

This phase adds:

- email/password sign up
- email/password sign in
- JWT-based authentication
- user-to-tenant membership model
- tenant access validation on existing tenant routes
- protected frontend routes

This phase does not add:

- password reset
- email verification
- invitations
- social login
- multi-tenant switcher UI

## Product Decisions

### Sign Up

Sign up creates a brand-new workspace and its owner in one operation.

Input:

- workspace name
- workspace slug
- user name
- email
- password

Output:

- access token
- authenticated user
- created tenant

### Sign In

Sign in uses email and password only.

The backend returns:

- access token
- authenticated user
- memberships

The frontend can then route the user into the correct tenant path.

## Recommended Approach

Use stateless bearer auth with JWT.

Why:

- fits the current React + FastAPI split
- requires minimal server-side session machinery
- is easy to test in API and frontend integration tests
- keeps the authorization rule explicit on each tenant-scoped request

## Data Model

### `users`

- `id`
- `name`
- `email`
- `password_hash`
- `created_at`
- `updated_at`

Constraints:

- `email` unique

### `tenant_memberships`

- `id`
- `tenant_id`
- `user_id`
- `role`
- `created_at`

Initial role values:

- `owner`

The schema should be future-friendly for additional roles such as `member` or `admin`.

## Authorization Model

Authentication answers:

- who is the current user

Authorization answers:

- does this user belong to the tenant in the route

Every tenant-scoped protected route should enforce:

1. valid JWT
2. existing user
3. membership exists for `tenant_slug`

Without membership, the API returns `403`.

## Backend Design

### New Modules

- `auth`
Password hashing, JWT creation, current-user resolution

- `memberships`
Tenant membership lookup and authorization helpers

### New Endpoints

- `POST /auth/signup`
- `POST /auth/signin`
- `GET /auth/me`

### Existing Protected Endpoints

The following routes become authenticated:

- `POST /t/{tenant_slug}/uploads`
- `GET /t/{tenant_slug}/jobs`
- `GET /t/{tenant_slug}/jobs/{job_id}`
- `POST /t/{tenant_slug}/jobs/{job_id}/retry`
- `GET /t/{tenant_slug}/jobs/{job_id}/download`

### Signup Transaction

The signup flow should run transactionally:

1. validate email uniqueness
2. validate tenant slug uniqueness
3. hash password
4. create tenant
5. create user
6. create owner membership
7. issue JWT

If any step fails, the transaction rolls back.

### Signin Flow

1. find user by email
2. verify password hash
3. load memberships
4. issue JWT

### JWT Payload

Minimal payload:

- subject: user id
- email

The token should not embed tenant authorization decisions because memberships may change. Tenant membership should still be resolved from the database at request time.

## Frontend Design

### New Routes

- `/signup`
- `/signin`

### Protected Flow

- unauthenticated users trying to access `/t/:tenantSlug/*` should be redirected to `/signin`
- successful sign up redirects to the newly created tenant route
- successful sign in redirects to the first available tenant route

### Client Storage

Store the JWT in client state plus local storage for session persistence across refresh.

### UI Scope

#### Sign Up page

- workspace name
- workspace slug
- user name
- email
- password

#### Sign In page

- email
- password

#### Sign Out

- simple client-side token clear and redirect to `/signin`

## API Contracts

### `POST /auth/signup`

Request:

- `workspace_name`
- `workspace_slug`
- `name`
- `email`
- `password`

Response:

- `access_token`
- `token_type`
- `user`
- `tenant`

### `POST /auth/signin`

Request:

- `email`
- `password`

Response:

- `access_token`
- `token_type`
- `user`
- `memberships`

### `GET /auth/me`

Response:

- `user`
- `memberships`

## Security Baseline

- passwords hashed with a strong password hasher
- no plaintext password storage
- invalid credentials return generic errors
- protected routes never trust tenant slug alone
- JWT secret comes from environment

## Migration Strategy

This phase changes the current assumption that tenant URLs alone are enough for access.

The default seeded `acme` tenant should be removed or demoted from being the primary onboarding path once signup is live.

If a seed is still needed for development, it should be explicitly dev-only and not bypass auth.

## Testing Strategy

### Backend

- signup creates tenant, user, and membership
- signin returns token for valid credentials
- signin rejects invalid credentials
- protected tenant routes reject unauthenticated access
- protected tenant routes reject access without membership
- protected tenant routes allow access with membership

### Frontend

- signup page submits and stores auth state
- signin page submits and stores auth state
- protected routes redirect when no token exists
- tenant pages render when token exists

## Success Criteria

This phase is complete when:

- a user can create a new workspace through signup
- the created user becomes owner of that workspace
- the user can sign in later with email and password
- tenant-scoped routes require authentication
- tenant-scoped routes enforce tenant membership
- the frontend redirects correctly between auth and protected pages
