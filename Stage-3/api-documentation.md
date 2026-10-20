# Amlak API — MVP

> REST contract for the Amlak MVP web app. It covers every Must Have story in the SRS, built the simplest way that works. Data shapes follow the SRS §6 classes and §7 ER diagram in `amlak-srs-diagrams.md`. If this document and those diagrams disagree, fix this document.

## Overview

- **Version:** `1.0.0` (MVP)
- **Endpoints:** **67**
- **Format:** JSON with `snake_case` fields and UUID ids. Endpoints that take photos use `multipart/form-data`.
- **Authentication:** 15-minute JWT access token, plus a 30-day refresh token in an `HttpOnly` cookie

## Base URLs

- `https://api.example.com/api/v1` — Proposed production URL; replace with the real one
- `http://localhost:3001/api/v1` — Local development (the port comes from `PORT` in `.env`)

Paths below are relative to the base URL.

## Conventions

| Topic | Rule |
|---|---|
| Body | JSON, except endpoints that take files. Those use `multipart/form-data`, with each field as a text part and each file as a file part |
| Dates | `date` fields use `YYYY-MM-DD` in the place's time zone (`Place.timezone`) |
| Timestamps | `*_at` fields use ISO 8601 in UTC, e.g. `2026-01-01T10:00:00Z` |
| Money | A number with at most 2 decimals, in the place's `currency`. Amounts in different currencies are never added together |
| Updates | `PUT` bodies are partial: omitted fields stay unchanged. To clear a nullable field, send `null` in JSON or an empty value in multipart |
| Lists | Every list returns `{ "data": [...], "pagination": {...} }` and accepts `page` (default 1) and `page_size` (default 20, max 100) |
| Language | Error messages, emails and notifications use the user's `preferred_language`. Public endpoints read the `Accept-Language` header: `ar` or `en`, default `ar` |
| Deleting | Deleting a place or asset sets `deleted_at`. Deleted places and assets, and everything in them, are hidden from every endpoint |
| Open ticket | A maintenance ticket in `PENDING_REVIEW` or `APPROVED` |
| Notifications | Nobody is notified about their own action |

## Authentication

Send the access token on every endpoint not marked **Public**:

```http
Authorization: Bearer <access_token>
```

The access token is a JWT valid for 15 minutes that carries `user_id` and `role`. The refresh token is valid for 30 days. It is stored hashed in `REFRESH_TOKEN`, replaced on every refresh, and revoked on logout, password reset and deactivation. The API sets it as a cookie that the web app's JavaScript cannot read:

```http
Set-Cookie: refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000
```

When a request returns `401 UNAUTHENTICATED`, the web app calls `POST /auth/refresh` once and retries. If the refresh fails, it shows the login screen.

| Status | Meaning | Becomes `ACTIVE` through |
|---|---|---|
| `PENDING_VERIFICATION` | A registered Manager who has not verified their email | `POST /auth/verify-email` |
| `INVITED` | A Worker who has not set a password yet | `POST /auth/account-setup` |
| `ACTIVE` | Can log in | — |
| `DEACTIVATED` | Blocked; history is kept | `PUT /users/{userId}` or `PUT /workers/{workerId}` |

Only `ACTIVE` users can log in or refresh, and a Worker whose Manager is `DEACTIVATED` is rejected too. Deactivating a user revokes their refresh tokens; deactivating a Manager also revokes their workers' tokens. An access token issued before a deactivation keeps working until it expires, at most 15 minutes later.

## Roles and Access

There are three roles: `ADMIN`, `MANAGER` and `WORKER`. They are rows in the `ROLE` table, so `USER.role_id` can only point to a real role. Managers register themselves, Managers create Workers, and Admins are created by a seed script.

Access is checked in two steps:

1. **Role.** Each endpoint lists the roles that can call it. The route compares that list with the `role` name in the access token. Endpoints marked **Any role** need only a valid access token.
2. **Ids.** The service then checks that the record belongs to the caller:

| Record | The caller must be |
|---|---|
| A place and everything in it | Its owner (`PLACE.owner_id`), or a Worker with an active `PLACE_WORKER` row for it |
| A worker account | That worker's Manager (`USER.manager_id`) |
| A ticket being completed | Its assignee (`MAINTENANCE_TICKET.assignee_id`) |
| A support ticket | Its submitter (`SUPPORT_TICKET.user_id`), or an Admin |
| A notification | Its recipient (`NOTIFICATION.user_id`) |

Failing either step returns `403 FORBIDDEN`, and lists contain only the caller's rows. Admins have no access to places or anything in them.

**Financial data.** Workers never receive expenses, financial reports, `monthly_maintenance_budget`, the dashboard's `maintenance_budget` or a ticket's `estimated_cost`.

## Errors

Every error has the same body. `message` is written in the caller's language and can be shown to the user as is. `details` is optional and always an object.

```json
{
  "code": "CONFLICT",
  "message": "These dates overlap another booking",
  "details": { "conflicting_booking_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c51" }
}
```

A validation error lists every bad field:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Some fields are invalid",
  "details": {
    "fields": {
      "email": "Invalid email address",
      "password": "Too small: expected string to have >=8 characters"
    }
  }
}
```

| Status | `code` | When |
|---|---|---|
| 401 | `UNAUTHENTICATED` | The access token or the refresh cookie is missing, invalid or expired. Sent with `WWW-Authenticate: Bearer` |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password at login |
| 403 | `ACCOUNT_NOT_ACTIVE` | The login password is right but the account cannot log in; `details.reason` says why |
| 403 | `FORBIDDEN` | The caller's role cannot use the endpoint, or the record belongs to someone else |
| 404 | `NOT_FOUND` | The resource does not exist or is deleted |
| 409 | `CONFLICT` | Current data blocks the action: the resource is in the wrong status, a value is taken, dates overlap, or other records must be handled first. `details` names them |
| 422 | `VALIDATION_ERROR` | The body is malformed, or a field is missing or invalid. `details.fields` maps each bad field to a reason |
| 429 | `RATE_LIMITED` | Too many requests; the `Retry-After` header gives the wait in seconds |
| 500 | `INTERNAL_ERROR` | Unexpected server error |

Any endpoint can return the errors in this table, so each endpoint below lists only the cases specific to it. The web app needs to branch on `code` only for `UNAUTHENTICATED` (refresh, then retry), `ACCOUNT_NOT_ACTIVE` (route by reason) and `VALIDATION_ERROR` (mark the fields).

## Photos

Photos travel in the same request as the data they belong to, as file parts of a `multipart/form-data` body:

| Endpoint | File part | Files |
|---|---|---|
| `PUT /users/me` | `picture` | 0–1 |
| `POST /places/{placeId}/tickets` | `photos` | 0–5, saved as `DAMAGE` |
| `POST /tickets/{ticketId}/complete` | `photos` | 1–5, saved as `AFTER_REPAIR` |
| `POST /places/{placeId}/expenses`, `PUT /expenses/{expenseId}` | `receipt` | 0–1 |

Each file must be JPEG, PNG or WebP and at most 10 MB. The server resizes and compresses each image, stores it in a private, encrypted S3 bucket and saves the object key in the database. Responses return images as pre-signed URLs valid for 1 hour.

To send several photos, repeat the part:

```bash
curl -X POST https://api.example.com/api/v1/places/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10/tickets \
  -H "Authorization: Bearer <access_token>" \
  -F asset_id=9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20 \
  -F priority=HIGH \
  -F "description=Living-room AC blows warm air" \
  -F photos=@ac-front.jpg \
  -F photos=@ac-label.jpg
```

## Audit Log

These actions write an `AUDIT_LOG` row with the user, action, entity and before/after values. The log is append-only and has no endpoint.

- Logging in
- Submitting, approving, rejecting, reassigning and completing tickets
- Adding, cancelling, checking in and checking out bookings
- Adding, updating and deleting expenses
- Deleting a place and removing an asset
- Creating, deleting, assigning and unassigning workers
- Deactivating and reactivating any account

## Endpoint Index

### Auth
- `POST /auth/register` — Register a manager account
- `POST /auth/verify-email` — Verify the registration code
- `POST /auth/verification-code` — Send a new registration code
- `POST /auth/login` — Log in
- `POST /auth/refresh` — Get a new access token
- `POST /auth/logout` — Log out
- `POST /auth/password/forgot` — Email a password reset link
- `POST /auth/password/reset` — Set a new password from the link
- `POST /auth/account-setup` — Worker sets a password from the invitation

### Profile
- `GET /users/me` — Get my profile
- `PUT /users/me` — Update my profile and picture

### Users (Admin)
- `GET /users` — List users
- `GET /users/{userId}` — Get a user
- `PUT /users/{userId}` — Edit, deactivate or reactivate a user

### Workers
- `GET /workers` — List my workers
- `POST /workers` — Create a worker and email the invitation
- `GET /workers/{workerId}` — Get a worker
- `PUT /workers/{workerId}` — Edit, deactivate or reactivate a worker
- `DELETE /workers/{workerId}` — Delete a worker who never set up their account

### Places
- `GET /places` — List places
- `POST /places` — Create a place
- `GET /places/{placeId}` — Get a place
- `PUT /places/{placeId}` — Update a place
- `DELETE /places/{placeId}` — Delete a place
- `GET /places/{placeId}/workers` — List the workers assigned to a place
- `POST /places/{placeId}/workers` — Assign a worker
- `DELETE /places/{placeId}/workers/{workerId}` — Unassign a worker

### Dashboard
- `GET /dashboard` — Property and asset health

### Assets
- `GET /places/{placeId}/assets` — List a place's assets
- `POST /places/{placeId}/assets` — Add an asset
- `GET /assets/{assetId}` — Get an asset
- `PUT /assets/{assetId}` — Update an asset
- `DELETE /assets/{assetId}` — Remove an asset

### Maintenance Schedules
- `GET /assets/{assetId}/maintenance-schedules` — List an asset's schedules
- `POST /assets/{assetId}/maintenance-schedules` — Schedule periodic maintenance
- `DELETE /maintenance-schedules/{scheduleId}` — Stop a schedule

### Maintenance Tickets
- `GET /tickets` — List tickets
- `POST /places/{placeId}/tickets` — Report damage, with photos
- `GET /tickets/{ticketId}` — Get a ticket with its photos
- `POST /tickets/{ticketId}/approve` — Approve and assign
- `POST /tickets/{ticketId}/reject` — Reject
- `POST /tickets/{ticketId}/reassign` — Change the assignee or due date
- `POST /tickets/{ticketId}/complete` — Complete, with after photos

### Bookings
- `GET /places/{placeId}/bookings` — Booking calendar
- `POST /places/{placeId}/bookings` — Add a booking
- `GET /bookings/{bookingId}` — Get a booking
- `POST /bookings/{bookingId}/cancel` — Cancel a booking
- `POST /bookings/{bookingId}/check-in` — Check the guest in
- `POST /bookings/{bookingId}/check-out` — Check the guest out

### Expenses
- `GET /places/{placeId}/expenses` — List a place's expenses
- `POST /places/{placeId}/expenses` — Log an expense, with a receipt photo
- `GET /expenses/{expenseId}` — Get an expense
- `PUT /expenses/{expenseId}` — Update an expense
- `DELETE /expenses/{expenseId}` — Delete an expense

### Reports
- `GET /reports/financial` — Income, expenses and profit for a period

### Notifications
- `GET /notifications` — List my notifications
- `POST /notifications/{notificationId}/read` — Mark a notification as read
- `POST /notifications` — Send an announcement (Admin)

### Support
- `GET /support-tickets` — List support tickets
- `POST /support-tickets` — Submit a support ticket
- `GET /support-tickets/{ticketId}` — Get a support ticket
- `POST /support-tickets/{ticketId}/resolve` — Resolve with a response

### Web Content
- `GET /content` — List pages
- `POST /content` — Create a page
- `GET /content/{contentId}` — Get a page
- `PUT /content/{contentId}` — Edit, publish or unpublish a page
- `DELETE /content/{contentId}` — Delete a page

---

# Auth

## `POST /auth/register`

Register a manager account. **Public.**

Creates a `MANAGER` with status `PENDING_VERIFICATION` and emails a 6-digit code that is valid for 10 minutes.

| Body field | Type | Required | Rules |
|---|---|---|---|
| `fullname` | string | Yes | |
| `email` | string (email) | Yes | Unique |
| `phone` | string | Yes | E.164 format, e.g. `+966512345678` |
| `password` | string | Yes | At least 8 characters |
| `preferred_language` | `Language` | No | Default `ar` |

**201** → `User`. No tokens are issued until the email is verified.

Example response (`201 Created`):

```json
{
  "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "email": "sara@example.com",
  "fullname": "Sara Alqahtani",
  "phone": "+966512345678",
  "picture_url": null,
  "role": "MANAGER",
  "status": "PENDING_VERIFICATION",
  "preferred_language": "ar",
  "email_verified_at": null,
  "manager_id": null,
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:00:00Z"
}
```

**Errors:** `409 CONFLICT` — the email is taken

## `POST /auth/verify-email`

Verify the registration code. **Public.**

| Body field | Type | Required |
|---|---|---|
| `email` | string (email) | Yes |
| `code` | string | Yes |

**204** → the user becomes `ACTIVE` and `email_verified_at` is set. The web app then calls `POST /auth/login`.

```http
HTTP/1.1 204 No Content
```

**Errors:**
- `422 VALIDATION_ERROR` — the code is wrong, expired or used, or has failed 5 times
- `409 CONFLICT` — the email is already verified

## `POST /auth/verification-code`

Send a new registration code. **Public.**

| Body field | Type | Required |
|---|---|---|
| `email` | string (email) | Yes |

**204** → if the email belongs to a `PENDING_VERIFICATION` user, a new code is emailed and the previous one stops working. Every other email gets the same response, so the endpoint does not reveal which accounts exist.

```http
HTTP/1.1 204 No Content
```

**Errors:** `429 RATE_LIMITED` — more than 1 request per 60 seconds or 5 per hour for the same user

## `POST /auth/login`

Log in. **Public.**

| Body field | Type | Required |
|---|---|---|
| `email` | string (email) | Yes |
| `password` | string | Yes |

**200** → the access token and the user. The refresh token cookie is set too.

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "user": {
    "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
    "email": "sara@example.com",
    "fullname": "Sara Alqahtani",
    "phone": "+966512345678",
    "picture_url": null,
    "role": "MANAGER",
    "status": "ACTIVE",
    "preferred_language": "ar",
    "email_verified_at": "2026-01-01T10:05:00Z",
    "manager_id": null,
    "created_at": "2026-01-01T10:00:00Z",
    "updated_at": "2026-01-01T10:05:00Z"
  }
}
```

**Errors:**
- `401 INVALID_CREDENTIALS` — wrong email or password
- `403 ACCOUNT_NOT_ACTIVE` — the password is right, but the account cannot log in. The status is checked only after the password matches, so a stranger learns nothing about the account. `details.reason` tells the web app what to show:

| `details.reason` | The web app shows |
|---|---|
| `EMAIL_NOT_VERIFIED` | The code screen, after calling `POST /auth/verification-code` |
| `INVITATION_PENDING` | A hint to open the invitation email |
| `ACCOUNT_DEACTIVATED` | The contact-support message |
| `MANAGER_DEACTIVATED` | The contact-support message |

## `POST /auth/refresh`

Get a new access token. **Public:** authenticated by the refresh token cookie. No body.

**200** → a new access token, and a new refresh token cookie that replaces the old one.

```json
{ "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", "token_type": "Bearer", "expires_in": 900 }
```

**Errors:** `401 UNAUTHENTICATED` — the cookie is missing, expired or revoked, or the user (or a Worker's Manager) is not `ACTIVE`

## `POST /auth/logout`

Log out. **Public:** uses the refresh token cookie. No body.

**204** → the refresh token is revoked and the cookie is cleared. Also succeeds when there is no cookie.

```http
HTTP/1.1 204 No Content
Set-Cookie: refresh_token=; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=0
```

## `POST /auth/password/forgot`

Email a password reset link. **Public.**

| Body field | Type | Required |
|---|---|---|
| `email` | string (email) | Yes |

**204** → if the email belongs to an `ACTIVE` user, they get a single-use link valid for 60 minutes: `https://app.example.com/reset-password?email=<email>&token=<token>`. Any earlier link stops working. Every other email gets the same response.

```http
HTTP/1.1 204 No Content
```

**Errors:** `429 RATE_LIMITED` — same limits as `POST /auth/verification-code`

## `POST /auth/password/reset`

Set a new password from the reset link. **Public.**

| Body field | Type | Required | Rules |
|---|---|---|---|
| `email` | string (email) | Yes | |
| `token` | string | Yes | From the link |
| `new_password` | string | Yes | At least 8 characters |

**204** → the password changes and all the user's refresh tokens are revoked, so every device has to log in again.

```http
HTTP/1.1 204 No Content
```

**Errors:** `422 VALIDATION_ERROR` — the link is wrong, expired or used

## `POST /auth/account-setup`

A worker sets their password from the invitation. **Public.**

The invitation email links to `https://app.example.com/account-setup?email=<email>&token=<token>`, valid for 7 days.

| Body field | Type | Required | Rules |
|---|---|---|---|
| `email` | string (email) | Yes | |
| `token` | string | Yes | From the link |
| `password` | string | Yes | At least 8 characters |

**204** → the worker goes from `INVITED` to `ACTIVE`, and `email_verified_at` is set because opening the link proves the email. The worker then logs in.

```http
HTTP/1.1 204 No Content
```

**Errors:** `422 VALIDATION_ERROR` — the link is wrong, expired or used, or the account is no longer `INVITED`

---

# Profile

## `GET /users/me`

Get my profile. **Any role.**

**200** → `User`

Example response (`200 OK`):

```json
{
  "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "email": "sara@example.com",
  "fullname": "Sara Alqahtani",
  "phone": "+966512345678",
  "picture_url": null,
  "role": "MANAGER",
  "status": "ACTIVE",
  "preferred_language": "ar",
  "email_verified_at": "2026-01-01T10:05:00Z",
  "manager_id": null,
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:05:00Z"
}
```

## `PUT /users/me`

Update my profile. **Any role.** Body: `multipart/form-data`.

| Field | Type | Required | Rules |
|---|---|---|---|
| `fullname` | string | No | |
| `phone` | string | No | E.164 |
| `preferred_language` | `Language` | No | |
| `picture` | file | No | Replaces the profile picture |

Email, role and status cannot be changed here.

**200** → `User`

Example response (`200 OK`):

```json
{
  "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "email": "sara@example.com",
  "fullname": "Sara A. Alqahtani",
  "phone": "+966512345678",
  "picture_url": "https://amlak-uploads.s3.amazonaws.com/profiles/6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01/8c9d0e1f-2a3b-4c5d-9e6f-7a8b9c0d1e2f.jpg?X-Amz-Signature=...",
  "role": "MANAGER",
  "status": "ACTIVE",
  "preferred_language": "ar",
  "email_verified_at": "2026-01-01T10:05:00Z",
  "manager_id": null,
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-10-12T10:00:00Z"
}
```

---

# Users (Admin)

Every account, of every role. Managers manage their own workers under [Workers](#workers) instead.

## `GET /users`

List users. **Roles:** Admin

| Query | Type | Required | Notes |
|---|---|---|---|
| `role` | `RoleName` | No | |
| `status` | `UserStatus` | No | |
| `search` | string | No | Matches name or email |
| `page`, `page_size` | integer | No | |

**200** → paginated `User`

Example response (`200 OK`):

```json
{
  "data": [
    {
      "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
      "email": "sara@example.com",
      "fullname": "Sara Alqahtani",
      "phone": "+966512345678",
      "picture_url": null,
      "role": "MANAGER",
      "status": "ACTIVE",
      "preferred_language": "ar",
      "email_verified_at": "2026-01-01T10:05:00Z",
      "manager_id": null,
      "created_at": "2026-01-01T10:00:00Z",
      "updated_at": "2026-01-01T10:05:00Z"
    },
    {
      "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "email": "omar@example.com",
      "fullname": "Omar Alshehri",
      "phone": "+966555987654",
      "picture_url": null,
      "role": "WORKER",
      "status": "ACTIVE",
      "preferred_language": "ar",
      "email_verified_at": "2026-01-03T08:00:00Z",
      "manager_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
      "created_at": "2026-01-02T09:00:00Z",
      "updated_at": "2026-01-03T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 2,
    "total_pages": 1
  }
}
```

## `GET /users/{userId}`

Get a user. **Roles:** Admin

**200** → `User`

Example response (`200 OK`):

```json
{
  "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "email": "sara@example.com",
  "fullname": "Sara Alqahtani",
  "phone": "+966512345678",
  "picture_url": null,
  "role": "MANAGER",
  "status": "ACTIVE",
  "preferred_language": "ar",
  "email_verified_at": "2026-01-01T10:05:00Z",
  "manager_id": null,
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-01-01T10:05:00Z"
}
```

## `PUT /users/{userId}`

Edit, deactivate or reactivate a user. **Roles:** Admin

| Body field | Type | Required | Rules |
|---|---|---|---|
| `fullname` | string | No | |
| `phone` | string | No | E.164 |
| `status` | `ACTIVE` or `DEACTIVATED` | No | See below |

- **Deactivating** works from any status and revokes the user's refresh tokens. For a Manager, it also revokes their workers' tokens.
- **Reactivating** works only for a `DEACTIVATED` user whose email was verified.
- Admins cannot change their own status.

**200** → `User`

Example response (`200 OK`):

```json
{
  "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "email": "sara@example.com",
  "fullname": "Sara Alqahtani",
  "phone": "+966512345678",
  "picture_url": null,
  "role": "MANAGER",
  "status": "DEACTIVATED",
  "preferred_language": "ar",
  "email_verified_at": "2026-01-01T10:05:00Z",
  "manager_id": null,
  "created_at": "2026-01-01T10:00:00Z",
  "updated_at": "2026-10-12T11:00:00Z"
}
```

**Errors:**
- `409 CONFLICT` — the user cannot be reactivated
- `422 VALIDATION_ERROR` — an Admin changing their own status

---

# Workers

A Manager's own worker accounts.

## `GET /workers`

List my workers. **Roles:** Manager

| Query | Type | Required |
|---|---|---|
| `status` | `UserStatus` | No |
| `page`, `page_size` | integer | No |

**200** → paginated `Worker`

Example response (`200 OK`):

```json
{
  "data": [
    {
      "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "email": "omar@example.com",
      "fullname": "Omar Alshehri",
      "phone": "+966555987654",
      "picture_url": null,
      "role": "WORKER",
      "status": "ACTIVE",
      "preferred_language": "ar",
      "email_verified_at": "2026-01-03T08:00:00Z",
      "manager_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
      "created_at": "2026-01-02T09:00:00Z",
      "updated_at": "2026-01-03T08:00:00Z",
      "assigned_places": [
        {
          "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
          "place_name": "Al Noor Chalet"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## `POST /workers`

Create a worker and email the invitation. **Roles:** Manager

| Body field | Type | Required | Rules |
|---|---|---|---|
| `fullname` | string | Yes | |
| `email` | string (email) | Yes | Unique |
| `phone` | string | Yes | E.164 |
| `preferred_language` | `Language` | No | Default: the Manager's language |

**201** → `Worker` with `role: WORKER` and `status: INVITED`. The worker gets an account-setup link valid for 7 days; see `POST /auth/account-setup`.

Example response (`201 Created`):

```json
{
  "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "email": "omar@example.com",
  "fullname": "Omar Alshehri",
  "phone": "+966555987654",
  "picture_url": null,
  "role": "WORKER",
  "status": "INVITED",
  "preferred_language": "ar",
  "email_verified_at": null,
  "manager_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "created_at": "2026-01-02T09:00:00Z",
  "updated_at": "2026-01-02T09:00:00Z",
  "assigned_places": []
}
```

**Errors:** `409 CONFLICT` — the email is taken

## `GET /workers/{workerId}`

Get a worker. **Roles:** Manager

**200** → `Worker`

Example response (`200 OK`):

```json
{
  "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "email": "omar@example.com",
  "fullname": "Omar Alshehri",
  "phone": "+966555987654",
  "picture_url": null,
  "role": "WORKER",
  "status": "ACTIVE",
  "preferred_language": "ar",
  "email_verified_at": "2026-01-03T08:00:00Z",
  "manager_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "created_at": "2026-01-02T09:00:00Z",
  "updated_at": "2026-01-03T08:00:00Z",
  "assigned_places": [
    {
      "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
      "place_name": "Al Noor Chalet"
    }
  ]
}
```

## `PUT /workers/{workerId}`

Edit, deactivate or reactivate a worker. **Roles:** Manager

| Body field | Type | Required | Rules |
|---|---|---|---|
| `fullname` | string | No | |
| `phone` | string | No | E.164 |
| `status` | `ACTIVE` or `DEACTIVATED` | No | Same rules as `PUT /users/{userId}` |

Deactivating keeps the worker's assignments and history. Their open tickets stay assigned to them until the Manager reassigns them.

**200** → `Worker`

Example response (`200 OK`):

```json
{
  "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "email": "omar@example.com",
  "fullname": "Omar Alshehri",
  "phone": "+966555000111",
  "picture_url": null,
  "role": "WORKER",
  "status": "ACTIVE",
  "preferred_language": "ar",
  "email_verified_at": "2026-01-03T08:00:00Z",
  "manager_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "created_at": "2026-01-02T09:00:00Z",
  "updated_at": "2026-10-12T12:00:00Z",
  "assigned_places": [
    {
      "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
      "place_name": "Al Noor Chalet"
    }
  ]
}
```

**Errors:** `409 CONFLICT` — reactivating a worker who never set up their account

## `DELETE /workers/{workerId}`

Delete a worker who never set up their account. **Roles:** Manager

Allowed only while `email_verified_at` is empty. Removes the account, its tokens and its assignments. To resend an invitation, delete the worker and create them again. A worker who has used their account is deactivated instead, so their history stays.

**204**

```http
HTTP/1.1 204 No Content
```

**Errors:** `409 CONFLICT` — the worker has set up their account

---

# Places

## `GET /places`

List places. **Roles:** Manager, Worker

| Query | Type | Required |
|---|---|---|
| `status` | `PlaceStatus` | No |
| `page`, `page_size` | integer | No |

**200** → paginated `Place`

Example response (`200 OK`):

```json
{
  "data": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
      "owner_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
      "place_name": "Al Noor Chalet",
      "place_type": "chalet",
      "description": "Chalet with a private pool",
      "address": "Al Malqa, Riyadh",
      "city": "Riyadh",
      "latitude": 24.8143,
      "longitude": 46.6194,
      "status": "ACTIVE",
      "monthly_maintenance_budget": 2000,
      "currency": "SAR",
      "timezone": "Asia/Riyadh",
      "created_at": "2026-01-01T11:00:00Z",
      "updated_at": "2026-01-01T11:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

Workers get the same shape without `monthly_maintenance_budget`.

## `POST /places`

Create a place. **Roles:** Manager. The caller becomes the owner.

| Body field | Type | Required | Rules |
|---|---|---|---|
| `place_name` | string | Yes | |
| `place_type` | string | Yes | Free text, e.g. chalet, apartment, villa |
| `city` | string | Yes | |
| `address` | string | No | |
| `description` | string | No | |
| `latitude` | number | No | −90 to 90; send together with `longitude` |
| `longitude` | number | No | −180 to 180 |
| `status` | `PlaceStatus` | No | Default `ACTIVE` |
| `monthly_maintenance_budget` | number | No | ≥ 0 |
| `currency` | string | No | ISO 4217 code, default `SAR`. Cannot change later |
| `timezone` | string | No | IANA name, default `Asia/Riyadh`. Cannot change later |

The web app fills `latitude` and `longitude` from the browser's Geolocation API when the user picks "use my current location".

**201** → `Place`

Example response (`201 Created`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "owner_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "place_name": "Al Noor Chalet",
  "place_type": "chalet",
  "description": "Chalet with a private pool",
  "address": "Al Malqa, Riyadh",
  "city": "Riyadh",
  "latitude": 24.8143,
  "longitude": 46.6194,
  "status": "ACTIVE",
  "monthly_maintenance_budget": 2000,
  "currency": "SAR",
  "timezone": "Asia/Riyadh",
  "created_at": "2026-01-01T11:00:00Z",
  "updated_at": "2026-01-01T11:00:00Z"
}
```

## `GET /places/{placeId}`

Get a place. **Roles:** Manager, Worker

**200** → `Place`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "owner_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "place_name": "Al Noor Chalet",
  "place_type": "chalet",
  "description": "Chalet with a private pool",
  "address": "Al Malqa, Riyadh",
  "city": "Riyadh",
  "latitude": 24.8143,
  "longitude": 46.6194,
  "status": "ACTIVE",
  "monthly_maintenance_budget": 2000,
  "currency": "SAR",
  "timezone": "Asia/Riyadh",
  "created_at": "2026-01-01T11:00:00Z",
  "updated_at": "2026-01-01T11:00:00Z"
}
```

Workers get the same shape without `monthly_maintenance_budget`.

## `PUT /places/{placeId}`

Update a place. **Roles:** Manager

Body: the `POST /places` fields except `currency` and `timezone`, all optional.

**200** → `Place`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "owner_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "place_name": "Al Noor Chalet",
  "place_type": "chalet",
  "description": "Chalet with a private pool",
  "address": "Al Malqa, Riyadh",
  "city": "Riyadh",
  "latitude": 24.8143,
  "longitude": 46.6194,
  "status": "UNDER_MAINTENANCE",
  "monthly_maintenance_budget": 2000,
  "currency": "SAR",
  "timezone": "Asia/Riyadh",
  "created_at": "2026-01-01T11:00:00Z",
  "updated_at": "2026-10-12T13:00:00Z"
}
```

## `DELETE /places/{placeId}`

Delete a place. **Roles:** Manager

Sets `deleted_at`. The place and everything in it disappear from every endpoint, its workers lose access, and the scheduler skips it. A deleted place cannot be restored through the API.

**204**

```http
HTTP/1.1 204 No Content
```

**Errors:** `409 CONFLICT` — the place has `CONFIRMED` or `CHECKED_IN` bookings; `details.booking_ids`

## `GET /places/{placeId}/workers`

List the workers assigned to a place. **Roles:** Manager

**200** → paginated `PlaceWorker`

Example response (`200 OK`):

```json
{
  "data": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c11",
      "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
      "worker": {
        "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
        "fullname": "Omar Alshehri",
        "phone": "+966555987654",
        "status": "ACTIVE"
      },
      "assigned_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
      "assigned_at": "2026-01-03T09:00:00Z",
      "created_at": "2026-01-03T09:00:00Z",
      "updated_at": "2026-01-03T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## `POST /places/{placeId}/workers`

Assign a worker. **Roles:** Manager

| Body field | Type | Required | Rules |
|---|---|---|---|
| `worker_id` | uuid | Yes | One of the caller's workers who is not `DEACTIVATED` |

If the worker was assigned before, the earlier row is reactivated, because `place_id` + `worker_id` is unique.

**201** → `PlaceWorker`

Example response (`201 Created`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c11",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "worker": {
    "id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
    "fullname": "Omar Alshehri",
    "phone": "+966555987654",
    "status": "ACTIVE"
  },
  "assigned_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "assigned_at": "2026-01-03T09:00:00Z",
  "created_at": "2026-01-03T09:00:00Z",
  "updated_at": "2026-01-03T09:00:00Z"
}
```

**Errors:** `409 CONFLICT` — the worker is already assigned

## `DELETE /places/{placeId}/workers/{workerId}`

Unassign a worker. **Roles:** Manager

Sets the assignment's `is_active` to `false`. Schedules that name the worker as default assignee keep the name, and their next tickets go to review instead; see [Background Jobs](#background-jobs).

**204**

```http
HTTP/1.1 204 No Content
```

**Errors:**
- `404 NOT_FOUND` — the worker is not assigned to this place
- `409 CONFLICT` — the worker has `APPROVED` tickets on this place; `details.ticket_ids`. Reassign them first.

---

# Dashboard

## `GET /dashboard`

Property and asset health, one row per place. **Roles:** Manager, Worker

| Query | Type | Required | Notes |
|---|---|---|---|
| `place_id` | uuid | No | Only this place |
| `page`, `page_size` | integer | No | |

**200**

```json
{
  "data": [
    {
      "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
      "place_name": "Al Noor Chalet",
      "status": "ACTIVE",
      "assets": { "GOOD": 8, "NEEDS_MAINTENANCE": 1, "UNDER_MAINTENANCE": 0, "OUT_OF_SERVICE": 1 },
      "open_tickets": { "PENDING_REVIEW": 2, "APPROVED": 1, "overdue": 1 },
      "today": { "check_ins": 1, "check_outs": 1 },
      "maintenance_budget": { "currency": "SAR", "budget": 2000, "spent": 850, "remaining": 1150 }
    }
  ],
  "pagination": { "page": 1, "page_size": 20, "total": 1, "total_pages": 1 }
}
```

| Field | Meaning |
|---|---|
| `open_tickets.overdue` | `APPROVED` tickets past their `due_date` |
| `today.check_ins` | `CONFIRMED` bookings with `check_in_date` today, in the place's time zone |
| `today.check_outs` | `CHECKED_IN` bookings with `check_out_date` today |
| `maintenance_budget.spent` | `MAINTENANCE` expenses in the current calendar month |
| `maintenance_budget` | `null` when the place has no budget; never sent to Workers |

---

# Assets

## `GET /places/{placeId}/assets`

List a place's assets. **Roles:** Manager, Worker

| Query | Type | Required |
|---|---|---|
| `status` | `AssetStatus` | No |
| `page`, `page_size` | integer | No |

**200** → paginated `Asset`

Example response (`200 OK`):

```json
{
  "data": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
      "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
      "name": "Living-room AC",
      "type": "HVAC",
      "status": "GOOD",
      "purchase_date": "2025-06-15",
      "created_at": "2026-01-01T12:00:00Z",
      "updated_at": "2026-01-01T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## `POST /places/{placeId}/assets`

Add an asset. **Roles:** Manager

| Body field | Type | Required | Rules |
|---|---|---|---|
| `name` | string | Yes | |
| `type` | string | Yes | Free text, e.g. HVAC, pool pump |
| `purchase_date` | date | No | Not in the future |
| `status` | `AssetStatus` | No | Default `GOOD` |

**201** → `Asset`

Example response (`201 Created`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "name": "Living-room AC",
  "type": "HVAC",
  "status": "GOOD",
  "purchase_date": "2025-06-15",
  "created_at": "2026-01-01T12:00:00Z",
  "updated_at": "2026-01-01T12:00:00Z"
}
```

## `GET /assets/{assetId}`

Get an asset. **Roles:** Manager, Worker

**200** → `Asset`. Its repair history is `GET /tickets?asset_id=<assetId>`.

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "name": "Living-room AC",
  "type": "HVAC",
  "status": "GOOD",
  "purchase_date": "2025-06-15",
  "created_at": "2026-01-01T12:00:00Z",
  "updated_at": "2026-01-01T12:00:00Z"
}
```

## `PUT /assets/{assetId}`

Update an asset. **Roles:** Manager

Body: the `POST` fields, all optional. Approving and completing tickets also change `status`; see [Maintenance Tickets](#maintenance-tickets).

**200** → `Asset`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "name": "Living-room AC",
  "type": "HVAC",
  "status": "OUT_OF_SERVICE",
  "purchase_date": "2025-06-15",
  "created_at": "2026-01-01T12:00:00Z",
  "updated_at": "2026-10-12T14:00:00Z"
}
```

## `DELETE /assets/{assetId}`

Remove an asset. **Roles:** Manager

Sets `deleted_at` and stops the asset's maintenance schedules.

**204**

```http
HTTP/1.1 204 No Content
```

**Errors:** `409 CONFLICT` — the asset has open tickets; `details.ticket_ids`

---

# Maintenance Schedules

## `GET /assets/{assetId}/maintenance-schedules`

List an asset's active schedules. **Roles:** Manager, Worker

**200** → paginated `PeriodicMaintenance`

Example response (`200 OK`):

```json
{
  "data": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c30",
      "asset_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
      "description": "Clean filters and check refrigerant",
      "interval_count": 3,
      "interval_unit": "MONTH",
      "next_due_date": "2026-11-01",
      "lead_days": 7,
      "default_assignee_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "created_at": "2026-10-10T08:00:00Z",
      "updated_at": "2026-10-10T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## `POST /assets/{assetId}/maintenance-schedules`

Schedule periodic maintenance. **Roles:** Manager

| Body field | Type | Required | Rules |
|---|---|---|---|
| `description` | string | Yes | |
| `interval_count` | integer | Yes | 1–365. With `interval_unit`, how often the maintenance repeats: `2` + `WEEK` is every two weeks |
| `interval_unit` | `IntervalUnit` | Yes | |
| `next_due_date` | date | Yes | Today or later |
| `lead_days` | integer | No | 0–60, default 7. The ticket is created this many days before `next_due_date` |
| `default_assignee_id` | uuid | No | Who gets the generated tickets; same rule as a ticket's [assignee](#maintenance-tickets) |

```json
{
  "description": "Clean filters and check refrigerant",
  "interval_count": 3,
  "interval_unit": "MONTH",
  "next_due_date": "2026-11-01",
  "lead_days": 7,
  "default_assignee_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02"
}
```

**201** → `PeriodicMaintenance`

Example response (`201 Created`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c30",
  "asset_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
  "description": "Clean filters and check refrigerant",
  "interval_count": 3,
  "interval_unit": "MONTH",
  "next_due_date": "2026-11-01",
  "lead_days": 7,
  "default_assignee_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "created_at": "2026-10-10T08:00:00Z",
  "updated_at": "2026-10-10T08:00:00Z"
}
```

**Errors:** `422 VALIDATION_ERROR` — `default_assignee_id` is not allowed for this place

## `DELETE /maintenance-schedules/{scheduleId}`

Stop a schedule. **Roles:** Manager

Sets `is_active` to `false`. Tickets the schedule already created stay. To change a schedule, stop it and create a new one.

**204**

```http
HTTP/1.1 204 No Content
```

---

# Maintenance Tickets

```text
PENDING_REVIEW ──approve──▶ APPROVED ──complete──▶ COMPLETED
       │
       └──reject──▶ REJECTED
```

| Action | Ticket becomes | Asset becomes |
|---|---|---|
| Approve | `APPROVED` | `NEEDS_MAINTENANCE` |
| Complete | `COMPLETED` | `GOOD`, if it has no other open tickets |
| Reject | `REJECTED` | Unchanged |
| Reassign | Unchanged | Unchanged |

**Assignee.** A ticket's assignee is an `ACTIVE` Worker assigned to the ticket's place, or the place's owner. The owner option lets a Manager without workers handle their own tickets.

People report `CORRECTIVE` tickets. `PREVENTIVE` tickets come only from the scheduler; see [Background Jobs](#background-jobs).

## `GET /tickets`

List tickets. **Roles:** Manager, Worker

| Query | Type | Required | Notes |
|---|---|---|---|
| `place_id` | uuid | No | |
| `asset_id` | uuid | No | An asset's repair history |
| `status` | `TicketStatus` | No | |
| `assignee_id` | uuid | No | Pass your own id for "my tasks" |
| `overdue` | boolean | No | `true`: `APPROVED` tickets past their `due_date` |
| `page`, `page_size` | integer | No | |

**200** → paginated `MaintenanceTicket`, without `attachments`

Example response (`200 OK`):

```json
{
  "data": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
      "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
      "asset_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
      "periodic_maintenance_id": null,
      "ticket_type": "CORRECTIVE",
      "priority": "HIGH",
      "status": "APPROVED",
      "description": "Living-room AC blows warm air",
      "reporter_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "assignee_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "due_date": "2026-10-14",
      "is_overdue": false,
      "estimated_cost": 350,
      "actual_cost": null,
      "reviewed_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
      "reviewed_at": "2026-10-11T12:00:00Z",
      "rejection_reason": null,
      "completed_at": null,
      "completion_notes": null,
      "created_at": "2026-10-11T09:30:00Z",
      "updated_at": "2026-10-11T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

Workers get the same shape without `estimated_cost`.

## `POST /places/{placeId}/tickets`

Report damage or required maintenance. **Roles:** Manager, Worker. Body: `multipart/form-data`.

| Field | Type | Required | Rules |
|---|---|---|---|
| `asset_id` | uuid | No | An asset of this place |
| `priority` | `TicketPriority` | Yes | |
| `description` | string | Yes | |
| `photos` | file | No | Up to 5, saved as `DAMAGE` photos |

Creates a `CORRECTIVE` ticket in `PENDING_REVIEW` with the caller as reporter, and notifies the place owner in-app and by email (`TICKET_SUBMITTED`).

**201** → `MaintenanceTicket`

Example response (`201 Created`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "asset_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
  "periodic_maintenance_id": null,
  "ticket_type": "CORRECTIVE",
  "priority": "HIGH",
  "status": "PENDING_REVIEW",
  "description": "Living-room AC blows warm air",
  "reporter_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "assignee_id": null,
  "due_date": null,
  "is_overdue": false,
  "estimated_cost": null,
  "actual_cost": null,
  "reviewed_by": null,
  "reviewed_at": null,
  "rejection_reason": null,
  "completed_at": null,
  "completion_notes": null,
  "attachments": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c41",
      "attachment_type": "DAMAGE",
      "file_url": "https://amlak-uploads.s3.amazonaws.com/tickets/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40/0b8e5d7a-2c1f-4e3b-9a6d-7c8b9a0f1e2d.jpg?X-Amz-Signature=...",
      "uploaded_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "created_at": "2026-10-11T09:30:00Z",
      "updated_at": "2026-10-11T09:30:00Z"
    }
  ],
  "created_at": "2026-10-11T09:30:00Z",
  "updated_at": "2026-10-11T09:30:00Z"
}
```

## `GET /tickets/{ticketId}`

Get a ticket with its photos. **Roles:** Manager, Worker

**200** → `MaintenanceTicket` with `attachments`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "asset_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
  "periodic_maintenance_id": null,
  "ticket_type": "CORRECTIVE",
  "priority": "HIGH",
  "status": "APPROVED",
  "description": "Living-room AC blows warm air",
  "reporter_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "assignee_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "due_date": "2026-10-14",
  "is_overdue": false,
  "estimated_cost": 350,
  "actual_cost": null,
  "reviewed_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "reviewed_at": "2026-10-11T12:00:00Z",
  "rejection_reason": null,
  "completed_at": null,
  "completion_notes": null,
  "attachments": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c41",
      "attachment_type": "DAMAGE",
      "file_url": "https://amlak-uploads.s3.amazonaws.com/tickets/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40/0b8e5d7a-2c1f-4e3b-9a6d-7c8b9a0f1e2d.jpg?X-Amz-Signature=...",
      "uploaded_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "created_at": "2026-10-11T09:30:00Z",
      "updated_at": "2026-10-11T09:30:00Z"
    }
  ],
  "created_at": "2026-10-11T09:30:00Z",
  "updated_at": "2026-10-11T12:00:00Z"
}
```

Workers get the same shape without `estimated_cost`.

## `POST /tickets/{ticketId}/approve`

Approve and assign. **Roles:** Manager. The ticket must be `PENDING_REVIEW`.

| Body field | Type | Required | Rules |
|---|---|---|---|
| `assignee_id` | uuid | Yes | See **Assignee** above |
| `due_date` | date | Yes | Today or later |
| `estimated_cost` | number | Yes | ≥ 0 |

```json
{
  "assignee_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "due_date": "2026-10-14",
  "estimated_cost": 350
}
```

Sets `reviewed_by` and `reviewed_at`, and notifies the assignee (`TICKET_ASSIGNED`). The dashboard's `maintenance_budget` shows what is left of this month's budget.

**200** → `MaintenanceTicket`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "asset_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
  "periodic_maintenance_id": null,
  "ticket_type": "CORRECTIVE",
  "priority": "HIGH",
  "status": "APPROVED",
  "description": "Living-room AC blows warm air",
  "reporter_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "assignee_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "due_date": "2026-10-14",
  "is_overdue": false,
  "estimated_cost": 350,
  "actual_cost": null,
  "reviewed_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "reviewed_at": "2026-10-11T12:00:00Z",
  "rejection_reason": null,
  "completed_at": null,
  "completion_notes": null,
  "attachments": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c41",
      "attachment_type": "DAMAGE",
      "file_url": "https://amlak-uploads.s3.amazonaws.com/tickets/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40/0b8e5d7a-2c1f-4e3b-9a6d-7c8b9a0f1e2d.jpg?X-Amz-Signature=...",
      "uploaded_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "created_at": "2026-10-11T09:30:00Z",
      "updated_at": "2026-10-11T09:30:00Z"
    }
  ],
  "created_at": "2026-10-11T09:30:00Z",
  "updated_at": "2026-10-11T12:00:00Z"
}
```

**Errors:** `422 VALIDATION_ERROR` — the assignee is not allowed for this place

## `POST /tickets/{ticketId}/reject`

Reject. **Roles:** Manager. The ticket must be `PENDING_REVIEW`.

| Body field | Type | Required |
|---|---|---|
| `reason` | string | Yes |

Sets `rejection_reason`, `reviewed_by` and `reviewed_at`, and notifies the reporter (`TICKET_REJECTED`). Scheduler tickets have no reporter.

**200** → `MaintenanceTicket`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "asset_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
  "periodic_maintenance_id": null,
  "ticket_type": "CORRECTIVE",
  "priority": "HIGH",
  "status": "REJECTED",
  "description": "Living-room AC blows warm air",
  "reporter_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "assignee_id": null,
  "due_date": null,
  "is_overdue": false,
  "estimated_cost": null,
  "actual_cost": null,
  "reviewed_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "reviewed_at": "2026-10-11T12:00:00Z",
  "rejection_reason": "Already reported in another ticket",
  "completed_at": null,
  "completion_notes": null,
  "attachments": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c41",
      "attachment_type": "DAMAGE",
      "file_url": "https://amlak-uploads.s3.amazonaws.com/tickets/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40/0b8e5d7a-2c1f-4e3b-9a6d-7c8b9a0f1e2d.jpg?X-Amz-Signature=...",
      "uploaded_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "created_at": "2026-10-11T09:30:00Z",
      "updated_at": "2026-10-11T09:30:00Z"
    }
  ],
  "created_at": "2026-10-11T09:30:00Z",
  "updated_at": "2026-10-11T12:00:00Z"
}
```

## `POST /tickets/{ticketId}/reassign`

Change the assignee or due date. **Roles:** Manager. The ticket must be `APPROVED`.

| Body field | Type | Required | Rules |
|---|---|---|---|
| `assignee_id` | uuid | Yes | See **Assignee** above |
| `due_date` | date | Yes | Today or later |

Clears `reminder_sent_at` and `overdue_alert_sent_at` so the reminders run again for the new date, and notifies the new assignee (`TICKET_ASSIGNED`).

**200** → `MaintenanceTicket`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "asset_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
  "periodic_maintenance_id": null,
  "ticket_type": "CORRECTIVE",
  "priority": "HIGH",
  "status": "APPROVED",
  "description": "Living-room AC blows warm air",
  "reporter_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "assignee_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "due_date": "2026-10-16",
  "is_overdue": false,
  "estimated_cost": 350,
  "actual_cost": null,
  "reviewed_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "reviewed_at": "2026-10-11T12:00:00Z",
  "rejection_reason": null,
  "completed_at": null,
  "completion_notes": null,
  "attachments": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c41",
      "attachment_type": "DAMAGE",
      "file_url": "https://amlak-uploads.s3.amazonaws.com/tickets/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40/0b8e5d7a-2c1f-4e3b-9a6d-7c8b9a0f1e2d.jpg?X-Amz-Signature=...",
      "uploaded_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "created_at": "2026-10-11T09:30:00Z",
      "updated_at": "2026-10-11T09:30:00Z"
    }
  ],
  "created_at": "2026-10-11T09:30:00Z",
  "updated_at": "2026-10-12T08:00:00Z"
}
```

**Errors:** `422 VALIDATION_ERROR` — the assignee is not allowed for this place

## `POST /tickets/{ticketId}/complete`

Complete the work. **Roles:** Manager, Worker; assignee only. The ticket must be `APPROVED`. Body: `multipart/form-data`.

| Field | Type | Required | Rules |
|---|---|---|---|
| `actual_cost` | number | Yes | ≥ 0 |
| `completion_notes` | string | No | |
| `photos` | file | Yes | 1–5, saved as `AFTER_REPAIR` photos |

Sets `completed_at` and notifies the place owner (`TICKET_COMPLETED`). `actual_cost` is for information only: it reaches the financial report only when the Manager logs an expense with this `ticket_id`.

**200** → `MaintenanceTicket`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "asset_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
  "periodic_maintenance_id": null,
  "ticket_type": "CORRECTIVE",
  "priority": "HIGH",
  "status": "COMPLETED",
  "description": "Living-room AC blows warm air",
  "reporter_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "assignee_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "due_date": "2026-10-14",
  "is_overdue": false,
  "estimated_cost": 350,
  "actual_cost": 420,
  "reviewed_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "reviewed_at": "2026-10-11T12:00:00Z",
  "rejection_reason": null,
  "completed_at": "2026-10-13T16:00:00Z",
  "completion_notes": "Replaced the capacitor and refilled the refrigerant",
  "attachments": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c41",
      "attachment_type": "DAMAGE",
      "file_url": "https://amlak-uploads.s3.amazonaws.com/tickets/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40/0b8e5d7a-2c1f-4e3b-9a6d-7c8b9a0f1e2d.jpg?X-Amz-Signature=...",
      "uploaded_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "created_at": "2026-10-11T09:30:00Z",
      "updated_at": "2026-10-11T09:30:00Z"
    },
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c42",
      "attachment_type": "AFTER_REPAIR",
      "file_url": "https://amlak-uploads.s3.amazonaws.com/tickets/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40/5d2c8e1f-7a3b-4c9d-8e6f-1a2b3c4d5e6f.jpg?X-Amz-Signature=...",
      "uploaded_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "created_at": "2026-10-13T16:00:00Z",
      "updated_at": "2026-10-13T16:00:00Z"
    }
  ],
  "created_at": "2026-10-11T09:30:00Z",
  "updated_at": "2026-10-13T16:00:00Z"
}
```

**Errors:** `422 VALIDATION_ERROR` — no after photo was sent

---

# Bookings

A stay runs from `check_in_date` to `check_out_date`. The check-out day is free for the next guest, so a booking may start on another booking's check-out day.

```text
CONFIRMED ──check-in──▶ CHECKED_IN ──check-out──▶ CHECKED_OUT
    │
    └──cancel──▶ CANCELLED
```

A `CONFIRMED` booking is ready for check-in (`ready_for_check_in`) when today is on or after `check_in_date` in the place's time zone and no other booking on the place is `CHECKED_IN`.

## `GET /places/{placeId}/bookings`

Booking calendar. **Roles:** Manager, Worker

| Query | Type | Required |
|---|---|---|
| `from` | date | Yes |
| `to` | date | Yes |
| `status` | `BookingStatus` | No |
| `page`, `page_size` | integer | No |

Returns the bookings whose stay overlaps `from`–`to`.

**200** → paginated `Booking`

Example response (`200 OK`):

```json
{
  "data": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c50",
      "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
      "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "guest_name": "Fahad Alharbi",
      "guest_phone": "+966555123456",
      "guest_email": null,
      "guest_count": 6,
      "check_in_date": "2026-10-20",
      "check_out_date": "2026-10-22",
      "total_price": 1800,
      "currency": "SAR",
      "status": "CONFIRMED",
      "notes": "Late arrival, around 10 pm",
      "ready_for_check_in": false,
      "cancelled_at": null,
      "cancelled_by": null,
      "cancellation_reason": null,
      "checked_in_at": null,
      "checked_in_by": null,
      "checked_out_at": null,
      "checked_out_by": null,
      "created_at": "2026-10-11T10:00:00Z",
      "updated_at": "2026-10-11T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## `POST /places/{placeId}/bookings`

Add a booking. **Roles:** Manager, Worker

| Body field | Type | Required | Rules |
|---|---|---|---|
| `guest_name` | string | Yes | |
| `guest_phone` | string | Yes | E.164 |
| `guest_email` | string (email) | No | |
| `guest_count` | integer | Yes | ≥ 1 |
| `check_in_date` | date | Yes | |
| `check_out_date` | date | Yes | After `check_in_date` |
| `total_price` | number | Yes | ≥ 0, in the place's currency |
| `notes` | string | No | |

```json
{
  "guest_name": "Fahad Alharbi",
  "guest_phone": "+966555123456",
  "guest_count": 6,
  "check_in_date": "2026-10-20",
  "check_out_date": "2026-10-22",
  "total_price": 1800,
  "notes": "Late arrival, around 10 pm"
}
```

The overlap check and the insert run in one transaction that locks the place row, so two requests cannot book the same dates. The booking starts as `CONFIRMED`.

**201** → `Booking`

Example response (`201 Created`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c50",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "guest_name": "Fahad Alharbi",
  "guest_phone": "+966555123456",
  "guest_email": null,
  "guest_count": 6,
  "check_in_date": "2026-10-20",
  "check_out_date": "2026-10-22",
  "total_price": 1800,
  "currency": "SAR",
  "status": "CONFIRMED",
  "notes": "Late arrival, around 10 pm",
  "ready_for_check_in": false,
  "cancelled_at": null,
  "cancelled_by": null,
  "cancellation_reason": null,
  "checked_in_at": null,
  "checked_in_by": null,
  "checked_out_at": null,
  "checked_out_by": null,
  "created_at": "2026-10-11T10:00:00Z",
  "updated_at": "2026-10-11T10:00:00Z"
}
```

**Errors:**
- `409 CONFLICT` — the dates overlap another booking; `details.conflicting_booking_id`
- `422 VALIDATION_ERROR` — the place is not `ACTIVE`

## `GET /bookings/{bookingId}`

Get a booking. **Roles:** Manager, Worker

**200** → `Booking`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c50",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "guest_name": "Fahad Alharbi",
  "guest_phone": "+966555123456",
  "guest_email": null,
  "guest_count": 6,
  "check_in_date": "2026-10-20",
  "check_out_date": "2026-10-22",
  "total_price": 1800,
  "currency": "SAR",
  "status": "CONFIRMED",
  "notes": "Late arrival, around 10 pm",
  "ready_for_check_in": false,
  "cancelled_at": null,
  "cancelled_by": null,
  "cancellation_reason": null,
  "checked_in_at": null,
  "checked_in_by": null,
  "checked_out_at": null,
  "checked_out_by": null,
  "created_at": "2026-10-11T10:00:00Z",
  "updated_at": "2026-10-11T10:00:00Z"
}
```

## `POST /bookings/{bookingId}/cancel`

Cancel a booking. **Roles:** Manager, Worker. The booking must be `CONFIRMED`.

| Body field | Type | Required |
|---|---|---|
| `reason` | string | Yes |

Sets `cancelled_at`, `cancelled_by` and `cancellation_reason`. A cancelled booking frees its dates and does not count as income.

**200** → `Booking`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c50",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "guest_name": "Fahad Alharbi",
  "guest_phone": "+966555123456",
  "guest_email": null,
  "guest_count": 6,
  "check_in_date": "2026-10-20",
  "check_out_date": "2026-10-22",
  "total_price": 1800,
  "currency": "SAR",
  "status": "CANCELLED",
  "notes": "Late arrival, around 10 pm",
  "ready_for_check_in": false,
  "cancelled_at": "2026-10-15T09:00:00Z",
  "cancelled_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "cancellation_reason": "Guest changed plans",
  "checked_in_at": null,
  "checked_in_by": null,
  "checked_out_at": null,
  "checked_out_by": null,
  "created_at": "2026-10-11T10:00:00Z",
  "updated_at": "2026-10-15T09:00:00Z"
}
```

## `POST /bookings/{bookingId}/check-in`

Check the guest in. **Roles:** Manager, Worker. The booking must be ready for check-in. No body.

Sets the status to `CHECKED_IN`, plus `checked_in_at` and `checked_in_by`.

**200** → `Booking`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c50",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "guest_name": "Fahad Alharbi",
  "guest_phone": "+966555123456",
  "guest_email": null,
  "guest_count": 6,
  "check_in_date": "2026-10-20",
  "check_out_date": "2026-10-22",
  "total_price": 1800,
  "currency": "SAR",
  "status": "CHECKED_IN",
  "notes": "Late arrival, around 10 pm",
  "ready_for_check_in": false,
  "cancelled_at": null,
  "cancelled_by": null,
  "cancellation_reason": null,
  "checked_in_at": "2026-10-20T19:10:00Z",
  "checked_in_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "checked_out_at": null,
  "checked_out_by": null,
  "created_at": "2026-10-11T10:00:00Z",
  "updated_at": "2026-10-20T19:10:00Z"
}
```

**Errors:** `409 CONFLICT` — not ready: `details.reason` is `BEFORE_CHECK_IN_DATE`, or `PLACE_OCCUPIED` with `details.occupied_by_booking_id`

## `POST /bookings/{bookingId}/check-out`

Check the guest out. **Roles:** Manager, Worker. The booking must be `CHECKED_IN`. No body.

Sets the status to `CHECKED_OUT`, plus `checked_out_at` and `checked_out_by`.

**200** → `Booking`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c50",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "guest_name": "Fahad Alharbi",
  "guest_phone": "+966555123456",
  "guest_email": null,
  "guest_count": 6,
  "check_in_date": "2026-10-20",
  "check_out_date": "2026-10-22",
  "total_price": 1800,
  "currency": "SAR",
  "status": "CHECKED_OUT",
  "notes": "Late arrival, around 10 pm",
  "ready_for_check_in": false,
  "cancelled_at": null,
  "cancelled_by": null,
  "cancellation_reason": null,
  "checked_in_at": "2026-10-20T19:10:00Z",
  "checked_in_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "checked_out_at": "2026-10-22T08:45:00Z",
  "checked_out_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "created_at": "2026-10-11T10:00:00Z",
  "updated_at": "2026-10-22T08:45:00Z"
}
```

---

# Expenses

Workers have no access to this section or to Reports.

## `GET /places/{placeId}/expenses`

List a place's expenses. **Roles:** Manager

| Query | Type | Required | Notes |
|---|---|---|---|
| `from`, `to` | date | No | Filter on `expense_date` |
| `category` | `ExpenseCategory` | No | |
| `page`, `page_size` | integer | No | |

**200** → paginated `Expense`

Example response (`200 OK`):

```json
{
  "data": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c60",
      "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
      "ticket_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
      "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
      "category": "MAINTENANCE",
      "description": "AC capacitor and refrigerant",
      "amount": 420,
      "currency": "SAR",
      "expense_date": "2026-10-13",
      "receipt_url": "https://amlak-uploads.s3.amazonaws.com/receipts/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c60/3e4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6a7b.jpg?X-Amz-Signature=...",
      "created_at": "2026-10-13T18:00:00Z",
      "updated_at": "2026-10-13T18:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## `POST /places/{placeId}/expenses`

Log an expense. **Roles:** Manager. Body: `multipart/form-data`.

| Field | Type | Required | Rules |
|---|---|---|---|
| `category` | `ExpenseCategory` | Yes | |
| `amount` | number | Yes | > 0, in the place's currency |
| `expense_date` | date | Yes | |
| `description` | string | No | |
| `ticket_id` | uuid | No | A ticket of the same place |
| `receipt` | file | No | Photo of the receipt |

**201** → `Expense`

Example response (`201 Created`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c60",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "ticket_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
  "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "category": "MAINTENANCE",
  "description": "AC capacitor and refrigerant",
  "amount": 420,
  "currency": "SAR",
  "expense_date": "2026-10-13",
  "receipt_url": "https://amlak-uploads.s3.amazonaws.com/receipts/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c60/3e4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6a7b.jpg?X-Amz-Signature=...",
  "created_at": "2026-10-13T18:00:00Z",
  "updated_at": "2026-10-13T18:00:00Z"
}
```

## `GET /expenses/{expenseId}`

Get an expense. **Roles:** Manager

**200** → `Expense`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c60",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "ticket_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
  "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "category": "MAINTENANCE",
  "description": "AC capacitor and refrigerant",
  "amount": 420,
  "currency": "SAR",
  "expense_date": "2026-10-13",
  "receipt_url": "https://amlak-uploads.s3.amazonaws.com/receipts/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c60/3e4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6a7b.jpg?X-Amz-Signature=...",
  "created_at": "2026-10-13T18:00:00Z",
  "updated_at": "2026-10-13T18:00:00Z"
}
```

## `PUT /expenses/{expenseId}`

Update an expense. **Roles:** Manager. Body: `multipart/form-data`.

Fields: the `POST` fields, all optional. An empty `ticket_id` unlinks the ticket, and a new `receipt` replaces the old one.

**200** → `Expense`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c60",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "ticket_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
  "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "category": "MAINTENANCE",
  "description": "AC capacitor and refrigerant",
  "amount": 450,
  "currency": "SAR",
  "expense_date": "2026-10-13",
  "receipt_url": "https://amlak-uploads.s3.amazonaws.com/receipts/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c60/3e4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6a7b.jpg?X-Amz-Signature=...",
  "created_at": "2026-10-13T18:00:00Z",
  "updated_at": "2026-10-14T09:00:00Z"
}
```

## `DELETE /expenses/{expenseId}`

Delete an expense. **Roles:** Manager

Deletes the row; its audit entry keeps the old values.

**204**

```http
HTTP/1.1 204 No Content
```

---

# Reports

## `GET /reports/financial`

Income, expenses and profit for a period. **Roles:** Manager

| Query | Type | Required | Notes |
|---|---|---|---|
| `from` | date | Yes | |
| `to` | date | Yes | |
| `place_id` | uuid | No | One place; otherwise all the caller's places |

The report is computed on request and never stored:

- **Income**: `total_price` of bookings that are not `CANCELLED` and whose `check_in_date` falls in the period.
- **Expenses**: `amount` of expenses whose `expense_date` falls in the period. A ticket's `actual_cost` never counts.
- **Profit**: income minus expenses.

Places can use different currencies, so the report has one row per place plus totals per currency.

**200**

```json
{
  "period": { "from": "2026-10-01", "to": "2026-10-31" },
  "places": [
    {
      "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
      "place_name": "Al Noor Chalet",
      "currency": "SAR",
      "total_income": 12500,
      "total_expenses": 3150,
      "profit": 9350,
      "expenses_by_category": {
        "MAINTENANCE": 1200,
        "UTILITIES": 950,
        "TAXES": 0,
        "CLEANING": 800,
        "SUPPLIES": 200,
        "OTHER": 0
      }
    }
  ],
  "totals_by_currency": [
    { "currency": "SAR", "total_income": 12500, "total_expenses": 3150, "profit": 9350 }
  ]
}
```

---

# Notifications

## `GET /notifications`

List my notifications, newest first. **Any role.**

| Query | Type | Required |
|---|---|---|
| `is_read` | boolean | No |
| `page`, `page_size` | integer | No |

**200** → paginated `Notification`, plus `unread_count` for the inbox badge:

```json
{
  "data": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c70",
      "type": "TICKET_ASSIGNED",
      "title": "تم إسناد تذكرة صيانة إليك",
      "message": "مكيف الصالة في شاليه النور، الموعد 14 أكتوبر.",
      "is_read": false,
      "sender_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
      "created_at": "2026-10-11T12:00:00Z",
      "updated_at": "2026-10-11T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  },
  "unread_count": 1
}
```

## `POST /notifications/{notificationId}/read`

Mark a notification as read. **Any role**, own notifications only.

**200** → `Notification`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c70",
  "type": "TICKET_ASSIGNED",
  "title": "تم إسناد تذكرة صيانة إليك",
  "message": "مكيف الصالة في شاليه النور، الموعد 14 أكتوبر.",
  "is_read": true,
  "sender_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "created_at": "2026-10-11T12:00:00Z",
  "updated_at": "2026-10-11T12:30:00Z"
}
```

## `POST /notifications`

Send an announcement. **Roles:** Admin

| Body field | Type | Required | Rules |
|---|---|---|---|
| `role` | `RoleName` | One of `role` and `user_ids` | Every user with this role |
| `user_ids` | uuid[] | One of `role` and `user_ids` | Up to 1000 users |
| `title_en` | string | Yes | |
| `message_en` | string | Yes | |
| `title_ar` | string | Yes | |
| `message_ar` | string | Yes | |

```json
{
  "role": "MANAGER",
  "title_en": "Scheduled maintenance",
  "message_en": "Amlak will be unavailable on Friday from 2:00 to 3:00 am.",
  "title_ar": "صيانة مجدولة",
  "message_ar": "لن تتوفر خدمة أملاك يوم الجمعة من الساعة 2:00 إلى 3:00 صباحًا."
}
```

Each `ACTIVE` recipient gets one `ANNOUNCEMENT` in their `preferred_language`, in-app and by email.

**201** → `{ "recipient_count": 42 }`

Example response (`201 Created`):

```json
{
  "recipient_count": 42
}
```

**Errors:** `422 VALIDATION_ERROR` — both or neither of `role` and `user_ids`

---

# Support

## `GET /support-tickets`

List support tickets. **Roles:** Admin, Manager, Worker. Admins see every ticket; Managers and Workers see their own.

| Query | Type | Required |
|---|---|---|
| `status` | `SupportTicketStatus` | No |
| `page`, `page_size` | integer | No |

**200** → paginated `SupportTicket`

Example response (`200 OK`):

```json
{
  "data": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c80",
      "user_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
      "subject": "Receipt upload fails",
      "description": "Uploading a PNG receipt returns an error.",
      "status": "OPEN",
      "admin_response": null,
      "resolved_by": null,
      "resolved_at": null,
      "created_at": "2026-10-12T07:00:00Z",
      "updated_at": "2026-10-12T07:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## `POST /support-tickets`

Submit a support ticket. **Roles:** Manager, Worker

| Body field | Type | Required |
|---|---|---|
| `subject` | string | Yes |
| `description` | string | Yes |

**201** → `SupportTicket` with `status: OPEN`

Example response (`201 Created`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c80",
  "user_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "subject": "Receipt upload fails",
  "description": "Uploading a PNG receipt returns an error.",
  "status": "OPEN",
  "admin_response": null,
  "resolved_by": null,
  "resolved_at": null,
  "created_at": "2026-10-12T07:00:00Z",
  "updated_at": "2026-10-12T07:00:00Z"
}
```

## `GET /support-tickets/{ticketId}`

Get a support ticket. **Roles:** Admin, or the Manager or Worker who submitted it

**200** → `SupportTicket`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c80",
  "user_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "subject": "Receipt upload fails",
  "description": "Uploading a PNG receipt returns an error.",
  "status": "OPEN",
  "admin_response": null,
  "resolved_by": null,
  "resolved_at": null,
  "created_at": "2026-10-12T07:00:00Z",
  "updated_at": "2026-10-12T07:00:00Z"
}
```

## `POST /support-tickets/{ticketId}/resolve`

Resolve with a response. **Roles:** Admin. The ticket must be `OPEN`.

| Body field | Type | Required |
|---|---|---|
| `admin_response` | string | Yes |

Sets the status to `RESOLVED`, plus `resolved_by` and `resolved_at`, and notifies the submitter in-app and by email (`SUPPORT_RESOLVED`). If the problem comes back, the user submits a new ticket.

**200** → `SupportTicket`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c80",
  "user_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "subject": "Receipt upload fails",
  "description": "Uploading a PNG receipt returns an error.",
  "status": "RESOLVED",
  "admin_response": "Fixed: PNG receipts are accepted again.",
  "resolved_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e00",
  "resolved_at": "2026-10-12T15:00:00Z",
  "created_at": "2026-10-12T07:00:00Z",
  "updated_at": "2026-10-12T15:00:00Z"
}
```

---

# Web Content

## `GET /content`

List pages. **Public:** returns published pages, plus drafts when the caller sends an Admin token.

| Query | Type | Required | Notes |
|---|---|---|---|
| `language` | `Language` | No | |
| `slug` | string | No | With `language`, finds one page |
| `page`, `page_size` | integer | No | |

**200** → paginated `WebContent`

Example response (`200 OK`):

```json
{
  "data": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c90",
      "author_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e00",
      "title": "Privacy policy",
      "language": "en",
      "slug": "privacy-policy",
      "body": "We collect only the data needed to run Amlak...",
      "is_published": true,
      "created_at": "2026-01-01T08:00:00Z",
      "updated_at": "2026-01-01T08:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 1,
    "total_pages": 1
  }
}
```

## `POST /content`

Create a page. **Roles:** Admin

| Body field | Type | Required | Rules |
|---|---|---|---|
| `title` | string | Yes | |
| `language` | `Language` | Yes | |
| `slug` | string | Yes | Lowercase letters, digits and `-`; unique per language |
| `body` | string | Yes | |
| `is_published` | boolean | No | Default `false` |

**201** → `WebContent`

Example response (`201 Created`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c90",
  "author_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e00",
  "title": "Privacy policy",
  "language": "en",
  "slug": "privacy-policy",
  "body": "We collect only the data needed to run Amlak...",
  "is_published": true,
  "created_at": "2026-01-01T08:00:00Z",
  "updated_at": "2026-01-01T08:00:00Z"
}
```

**Errors:** `409 CONFLICT` — the slug is taken in this language

## `GET /content/{contentId}`

Get a page. **Public** for published pages; a draft needs an Admin token and returns `404` otherwise.

**200** → `WebContent`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c90",
  "author_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e00",
  "title": "Privacy policy",
  "language": "en",
  "slug": "privacy-policy",
  "body": "We collect only the data needed to run Amlak...",
  "is_published": true,
  "created_at": "2026-01-01T08:00:00Z",
  "updated_at": "2026-01-01T08:00:00Z"
}
```

## `PUT /content/{contentId}`

Edit, publish or unpublish a page. **Roles:** Admin

Body: `title`, `slug`, `body` and `is_published`, all optional. `language` cannot change, because each translation is its own page.

**200** → `WebContent`

Example response (`200 OK`):

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c90",
  "author_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e00",
  "title": "Privacy policy",
  "language": "en",
  "slug": "privacy-policy",
  "body": "We collect only the data needed to run Amlak...",
  "is_published": false,
  "created_at": "2026-01-01T08:00:00Z",
  "updated_at": "2026-10-12T16:00:00Z"
}
```

**Errors:** `409 CONFLICT` — the slug is taken in this language

## `DELETE /content/{contentId}`

Delete a page. **Roles:** Admin

**204**

```http
HTTP/1.1 204 No Content
```

---

# Background Jobs

A daily scheduler changes data that the API returns. None of these jobs has an endpoint, and all of them skip deleted places and assets.

| Job | Picks | Does |
|---|---|---|
| Preventive tickets | Active schedules where today ≥ `next_due_date` − `lead_days` | Creates a `PREVENTIVE` ticket with priority `MEDIUM`, due on `next_due_date`, then moves `next_due_date` forward by `interval_count` × `interval_unit`. Months and years are calendar months and years; when the day does not exist in the new month (31 January + 1 month), the date moves to that month's last day. If `default_assignee_id` still meets the assignee rule, the ticket starts `APPROVED` (asset `NEEDS_MAINTENANCE`) and the assignee gets `TICKET_ASSIGNED`. Otherwise it starts `PENDING_REVIEW` and the owner gets `TICKET_SUBMITTED` |
| Maintenance reminders | `APPROVED` tickets due tomorrow with no `reminder_sent_at` | Emails the assignee, adds a `MAINTENANCE_REMINDER` notification and sets `reminder_sent_at` |
| Overdue alerts | `APPROVED` tickets past their `due_date` with no `overdue_alert_sent_at` | Emails the place owner, adds a `MAINTENANCE_OVERDUE` notification and sets `overdue_alert_sent_at` |

Emails go through the email provider (SendGrid or AWS SES) in the recipient's `preferred_language`. Failed sends are retried up to 3 times with backoff.

---

# Data Models

## Enums

| Enum | Values |
|---|---|
| `RoleName` | `ADMIN`, `MANAGER`, `WORKER` |
| `UserStatus` | `INVITED`, `PENDING_VERIFICATION`, `ACTIVE`, `DEACTIVATED` |
| `Language` | `ar`, `en` |
| `PlaceStatus` | `ACTIVE`, `INACTIVE`, `UNDER_MAINTENANCE` |
| `AssetStatus` | `GOOD`, `NEEDS_MAINTENANCE`, `UNDER_MAINTENANCE`, `OUT_OF_SERVICE` |
| `IntervalUnit` | `DAY`, `WEEK`, `MONTH`, `YEAR` |
| `TicketType` | `CORRECTIVE`, `PREVENTIVE` |
| `TicketPriority` | `LOW`, `MEDIUM`, `HIGH`, `URGENT` |
| `TicketStatus` | `PENDING_REVIEW`, `APPROVED`, `REJECTED`, `COMPLETED` |
| `AttachmentType` | `DAMAGE`, `AFTER_REPAIR` |
| `BookingStatus` | `CONFIRMED`, `CHECKED_IN`, `CHECKED_OUT`, `CANCELLED` |
| `ExpenseCategory` | `MAINTENANCE`, `UTILITIES`, `TAXES`, `CLEANING`, `SUPPLIES`, `OTHER` |
| `NotificationType` | `TICKET_SUBMITTED`, `TICKET_ASSIGNED`, `TICKET_REJECTED`, `TICKET_COMPLETED`, `MAINTENANCE_REMINDER`, `MAINTENANCE_OVERDUE`, `SUPPORT_RESOLVED`, `ANNOUNCEMENT` |
| `SupportTicketStatus` | `OPEN`, `RESOLVED` |

## Entities

Every entity below also has `id` (uuid), `created_at` and `updated_at`, except `FinancialReport`. Image fields hold pre-signed URLs; the database stores S3 object keys. `ROLE`, `VERIFICATION_TOKEN`, `REFRESH_TOKEN` and `AUDIT_LOG` are never returned.

### `User`

| Field | Type | Notes |
|---|---|---|
| `email` | string | |
| `fullname` | string | |
| `phone` | string | |
| `picture_url` | string or null | From `picture_path` |
| `role` | `RoleName` | From `role_id` |
| `status` | `UserStatus` | |
| `preferred_language` | `Language` | |
| `email_verified_at` | datetime or null | |
| `manager_id` | uuid or null | Workers only |

`password_hash` is never returned. Example: the `user` object in `POST /auth/login`.

### `Worker`

A `User` plus `assigned_places`: the places with an active assignment, as `{ "place_id", "place_name" }` objects.

### `Place`

| Field | Type | Notes |
|---|---|---|
| `owner_id` | uuid | |
| `place_name` | string | |
| `place_type` | string | |
| `description` | string or null | |
| `address` | string or null | |
| `city` | string | |
| `latitude` | number or null | |
| `longitude` | number or null | |
| `status` | `PlaceStatus` | |
| `monthly_maintenance_budget` | number or null | Not sent to Workers |
| `currency` | string | ISO 4217 |
| `timezone` | string | IANA |

### `PlaceWorker`

| Field | Type | Notes |
|---|---|---|
| `place_id` | uuid | |
| `worker` | object | `{ "id", "fullname", "phone", "status" }` |
| `assigned_by` | uuid | |
| `assigned_at` | datetime | |

### `Asset`

| Field | Type |
|---|---|
| `place_id` | uuid |
| `name` | string |
| `type` | string |
| `status` | `AssetStatus` |
| `purchase_date` | date or null |

### `PeriodicMaintenance`

| Field | Type |
|---|---|
| `asset_id` | uuid |
| `description` | string |
| `interval_count` | integer |
| `interval_unit` | `IntervalUnit` |
| `next_due_date` | date |
| `lead_days` | integer |
| `default_assignee_id` | uuid or null |

### `MaintenanceTicket`

| Field | Type | Notes |
|---|---|---|
| `place_id` | uuid | |
| `asset_id` | uuid or null | |
| `periodic_maintenance_id` | uuid or null | Set on preventive tickets |
| `ticket_type` | `TicketType` | |
| `priority` | `TicketPriority` | |
| `status` | `TicketStatus` | |
| `description` | string | |
| `reporter_id` | uuid or null | Null on scheduler tickets |
| `assignee_id` | uuid or null | Set on approval |
| `due_date` | date or null | Set on approval or by the scheduler |
| `is_overdue` | boolean | Computed |
| `estimated_cost` | number or null | Set on approval; not sent to Workers |
| `actual_cost` | number or null | Set on completion |
| `reviewed_by` | uuid or null | |
| `reviewed_at` | datetime or null | |
| `rejection_reason` | string or null | |
| `completed_at` | datetime or null | |
| `completion_notes` | string or null | |
| `attachments` | `TicketAttachment[]` | Single-ticket responses only |

`reminder_sent_at` and `overdue_alert_sent_at` belong to the scheduler and are not returned.

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "asset_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c20",
  "periodic_maintenance_id": null,
  "ticket_type": "CORRECTIVE",
  "priority": "HIGH",
  "status": "APPROVED",
  "description": "Living-room AC blows warm air",
  "reporter_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "assignee_id": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "due_date": "2026-10-14",
  "is_overdue": false,
  "estimated_cost": 350,
  "actual_cost": null,
  "reviewed_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e01",
  "reviewed_at": "2026-10-11T12:00:00Z",
  "rejection_reason": null,
  "completed_at": null,
  "completion_notes": null,
  "attachments": [
    {
      "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c41",
      "attachment_type": "DAMAGE",
      "file_url": "https://amlak-uploads.s3.amazonaws.com/tickets/9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c40/0b8e5d7a-2c1f-4e3b-9a6d-7c8b9a0f1e2d.jpg?X-Amz-Signature=...",
      "uploaded_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
      "created_at": "2026-10-11T09:30:00Z",
      "updated_at": "2026-10-11T09:30:00Z"
    }
  ],
  "created_at": "2026-10-11T09:30:00Z",
  "updated_at": "2026-10-11T12:00:00Z"
}
```

### `TicketAttachment`

| Field | Type | Notes |
|---|---|---|
| `attachment_type` | `AttachmentType` | |
| `file_url` | string | Pre-signed URL |
| `uploaded_by` | uuid | |

### `Booking`

| Field | Type | Notes |
|---|---|---|
| `place_id` | uuid | |
| `created_by` | uuid | |
| `guest_name` | string | |
| `guest_phone` | string | |
| `guest_email` | string or null | |
| `guest_count` | integer | |
| `check_in_date` | date | |
| `check_out_date` | date | |
| `total_price` | number | |
| `currency` | string | The place's currency |
| `status` | `BookingStatus` | |
| `notes` | string or null | |
| `ready_for_check_in` | boolean | Computed; `false` unless `CONFIRMED` |
| `cancelled_at` | datetime or null | |
| `cancelled_by` | uuid or null | |
| `cancellation_reason` | string or null | |
| `checked_in_at` | datetime or null | |
| `checked_in_by` | uuid or null | |
| `checked_out_at` | datetime or null | |
| `checked_out_by` | uuid or null | |

```json
{
  "id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c50",
  "place_id": "9a7d1c3e-5f60-4b2a-9c8d-2e3f4a5b6c10",
  "created_by": "6f1c2a9e-3b4d-4c5e-8f70-1a2b3c4d5e02",
  "guest_name": "Fahad Alharbi",
  "guest_phone": "+966555123456",
  "guest_email": null,
  "guest_count": 6,
  "check_in_date": "2026-10-20",
  "check_out_date": "2026-10-22",
  "total_price": 1800,
  "currency": "SAR",
  "status": "CONFIRMED",
  "notes": "Late arrival, around 10 pm",
  "ready_for_check_in": false,
  "cancelled_at": null,
  "cancelled_by": null,
  "cancellation_reason": null,
  "checked_in_at": null,
  "checked_in_by": null,
  "checked_out_at": null,
  "checked_out_by": null,
  "created_at": "2026-10-11T10:00:00Z",
  "updated_at": "2026-10-11T10:00:00Z"
}
```

### `Expense`

| Field | Type | Notes |
|---|---|---|
| `place_id` | uuid | |
| `ticket_id` | uuid or null | |
| `created_by` | uuid | |
| `category` | `ExpenseCategory` | |
| `description` | string or null | |
| `amount` | number | |
| `currency` | string | The place's currency |
| `expense_date` | date | |
| `receipt_url` | string or null | Pre-signed URL |

### `FinancialReport`

One entry of `places` in `GET /reports/financial`. It is computed, not stored, so it has no `id` or timestamps.

| Field | Type | Notes |
|---|---|---|
| `place_id` | uuid | |
| `place_name` | string | |
| `currency` | string | |
| `total_income` | number | |
| `total_expenses` | number | |
| `profit` | number | |
| `expenses_by_category` | object | One key per `ExpenseCategory`, 0 when empty |

### `Notification`

| Field | Type | Notes |
|---|---|---|
| `type` | `NotificationType` | |
| `title` | string | In the recipient's language |
| `message` | string | In the recipient's language |
| `is_read` | boolean | |
| `sender_id` | uuid or null | Null for system notifications |

### `SupportTicket`

| Field | Type |
|---|---|
| `user_id` | uuid |
| `subject` | string |
| `description` | string |
| `status` | `SupportTicketStatus` |
| `admin_response` | string or null |
| `resolved_by` | uuid or null |
| `resolved_at` | datetime or null |

### `WebContent`

| Field | Type |
|---|---|
| `author_id` | uuid |
| `title` | string |
| `language` | `Language` |
| `slug` | string |
| `body` | string |
| `is_published` | boolean |

### `Pagination`

| Field | Type |
|---|---|
| `page` | integer |
| `page_size` | integer |
| `total` | integer |
| `total_pages` | integer |

---

# Story Coverage

Every Must Have story in SRS §2 maps to at least one endpoint.

| Must Have story | Covered by |
|---|---|
| Manager registers | `POST /auth/register` |
| Log in | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| One-time code by email | `POST /auth/verify-email` |
| Manage basic information | `GET /users/me`, `PUT /users/me` |
| Request a new code | `POST /auth/verification-code` |
| Reset password through an email link | `POST /auth/password/forgot`, `POST /auth/password/reset` |
| Explanations for camera and location permissions | Web app only |
| Add, edit and delete properties | `/places`, `/places/{placeId}` |
| Add, edit and remove assets | `/places/{placeId}/assets`, `/assets/{assetId}` |
| Create, edit, delete and deactivate worker accounts | `/workers`, `/workers/{workerId}`, `POST /auth/account-setup` |
| Assign and unassign workers | `/places/{placeId}/workers` |
| Report damaged assets | `POST /places/{placeId}/tickets` |
| Unified dashboard | `GET /dashboard` |
| Review maintenance tickets | `GET /tickets`, `POST /tickets/{ticketId}/approve`, `POST /tickets/{ticketId}/reject`, `POST /tickets/{ticketId}/reassign` |
| Maintenance reports with photos | `POST /places/{placeId}/tickets`, `POST /tickets/{ticketId}/complete` |
| Schedule periodic maintenance | `/assets/{assetId}/maintenance-schedules`, `DELETE /maintenance-schedules/{scheduleId}` |
| Email reminders for upcoming maintenance | Background job |
| Alerts for overdue maintenance | Background job, `GET /tickets?overdue=true` |
| Manage bookings | `/places/{placeId}/bookings`, `POST /bookings/{bookingId}/cancel` |
| Check guests in and out | `POST /bookings/{bookingId}/check-in`, `POST /bookings/{bookingId}/check-out` |
| Log expenses | `/places/{placeId}/expenses`, `/expenses/{expenseId}` |
| Financial reports | `GET /reports/financial` |
| Manage web content | `/content`, `/content/{contentId}` |
| View, edit and deactivate user accounts | `/users`, `/users/{userId}` |
| View support requests | `/support-tickets`, `POST /support-tickets/{ticketId}/resolve` |
| Send notifications | `POST /notifications`, `GET /notifications` |

---

# Not in the MVP

**Later releases, following the SRS priorities**

- Pre- and post-booking checklists (Should Have). They will add checklist tables and endpoints, and a checklist condition on check-in.
- Plans and payments, and admin statistics with export (Should Have).
- SSO, onboarding interests, the tutorial and tooltips (Could Have).
- SMS alerts, online guest booking, booking-platform sync and more languages (Won't Have).

**Cut to keep the MVP small.** The SRS mentions these, but no Must Have story needs them.

- Admin access to managers' places, tickets, bookings and money
- Restoring deleted places
- The ticket Start step and before photos
- Deleting ticket photos
- Editing schedules: stop one and create a new one instead
- Resending invitations: delete the unused worker and create them again
- Assigning and reopening support tickets
- Changing a user's role or a worker's manager: the first Admin comes from a seed script
