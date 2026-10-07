# Amlak Property & Maintenance Management API

> Complete API documentation generated from the Amlak OpenAPI 3.0.3 specification.

## API Overview

- **Version:** `1.0.0`
- **OpenAPI:** `3.0.3`
- **Total endpoints:** **58**
- **Authentication:** JWT Bearer Token
- **Missing Authorization:** `403` with `Bearer Token is required.`

## Base URLs

- `https://api.example.com/api/v1` — Proposed production base URL - replace with the actual API URL
- `http://localhost:3000/api/v1` — Proposed local development URL

## Authentication

All endpoints require the `Authorization` header unless an endpoint explicitly overrides this requirement.

```http
Authorization: Bearer <JWT_TOKEN>
```

### Missing Token Response

```json
{"message":"Bearer Token is required"}
```

## Endpoint Index

### Authentication
- `POST /auth/register` — Register a user
- `POST /auth/login` — Login
* `POST /auth/refresh-token` — Refresh access token
- `POST /auth/verification-code` — Request a verification code
- `POST /auth/verify` — Verify OTP or verification token
- `POST /auth/password/reset` — Reset password


### Users
- `GET /users/me` — Get current user profile
- `PATCH /users/me` — Update current user profile

### Admin
- `GET /users` — List users
- `POST /users` — Create a user
- `GET /users/{userId}` — Get a user
- `PATCH /users/{userId}` — Update a user
- `DELETE /users/{userId}` — Deactivate a user

### Places
- `GET /places` — List places
- `POST /places` — Create a place
- `GET /places/{placeId}` — Get a place
- `PATCH /places/{placeId}` — Update a place
- `DELETE /places/{placeId}` — Delete a place

### Assets
- `GET /places/{placeId}/assets` — List assets for a place
- `POST /places/{placeId}/assets` — Add an asset
- `GET /assets/{assetId}` — Get an asset
- `PATCH /assets/{assetId}` — Update an asset
- `DELETE /assets/{assetId}` — Delete an asset

### Maintenance
- `GET /assets/{assetId}/maintenance-schedules` — List periodic maintenance schedules
- `POST /assets/{assetId}/maintenance-schedules` — Schedule periodic maintenance
- `GET /maintenance-tickets` — List maintenance tickets
- `POST /maintenance-tickets` — Submit a maintenance ticket
- `GET /maintenance-tickets/{ticketId}` — Get a maintenance ticket
- `POST /maintenance-tickets/{ticketId}/approve` — Approve a maintenance ticket
- `POST /maintenance-tickets/{ticketId}/reject` — Reject a maintenance ticket
- `POST /maintenance-tickets/{ticketId}/complete` — Complete a maintenance ticket

### Bookings
- `GET /places/{placeId}/bookings` — List bookings for a place
- `POST /places/{placeId}/bookings` — Add a booking
- `GET /bookings/{bookingId}` — Get a booking
- `POST /bookings/{bookingId}` — Cancel a booking

### Expenses
- `GET /places/{placeId}/expenses` — List expenses
- `POST /places/{placeId}/expenses` — Add an expense
- `GET /expenses/{expenseId}` — Get an expense
- `PATCH /expenses/{expenseId}` — Update an expense
- `DELETE /expenses/{expenseId}` — Delete an expense

### Reports
- `GET /reports/financial` — Generate financial report
- `GET /reports/analytics` — Get reporting and analytics

### Notifications
- `GET /notifications` — List current user's notifications
- `POST /notifications` — Send notification
- `POST /notifications/{notificationId}/read` — Mark notification as read

### Support
- `GET /support-tickets` — List support tickets
- `POST /support-tickets` — Submit a support ticket
- `GET /support-tickets/{ticketId}` — Get a support ticket
- `PATCH /support-tickets/{ticketId}` — Update support ticket status

### Web Content
- `GET /content` — List web content
- `POST /content` — Create web content
- `GET /content/{contentId}` — Get web content
- `PATCH /content/{contentId}` — Update web content
- `DELETE /content/{contentId}` — Delete web content
- `POST /content/{contentId}/publish` — Publish web content

---

# Authentication

## 1. `POST /auth/register`

**Summary:** Register a user

**Description:** Creates a new user account.

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `RegisterRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fullname` | `string` | Yes | - |
| `email` | `string (email)` | Yes | - |
| `password` | `string (password)` | Yes | - |
| `phone` | `string` | No | - |

**Example request:**
```json
{
  "fullname": "string",
  "email": "user@example.com",
  "password": "string",
  "phone": "string"
}
```

### Responses

#### `201` — User created

**Response schema:** `AuthResponse`


```json
{
  "access_token": "string",
  "token_type": "Bearer",
  "user": "string"
}
```

#### `400` — Invalid request

**Response schema:** `Error`


```json
{
  "code": "string",
  "message": "string",
  "details": "string"
}
```

#### `409` — Email already exists

No response body.

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `POST /auth/login`

**Summary:** Login

**Description:** Authenticates a user and returns a JWT.

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `LoginRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string (email)` | Yes | - |
| `password` | `string (password)` | Yes | - |

**Example request:**
```json
{
  "email": "user@example.com",
  "password": "string"
}
```

### Responses

#### `200` — Authenticated

**Response schema:** `AuthResponse`


```json
{
  "access_token": "string",
  "token_type": "Bearer",
  "user": "string"
}
```

#### `401` — Authentication required or JWT is invalid

**Response schema:** `Error`


```json
{
  "code": "string",
  "message": "string",
  "details": "string"
}
```

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 3. `POST /auth/refresh-token`

**Summary:** Refresh access token

**Description:** Generates a new JWT access token using a valid refresh token.

**Authentication:** Required (Bearer JWT)

### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `RefreshTokenRequest`

| Field           | Type     | Required | Description         |
| --------------- | -------- | -------- | ------------------- |
| `refresh_token` | `string` | Yes      | Valid refresh token |

**Example request:**

```json
{
  "refresh_token": "string"
}
```

### Responses

#### `200` — Access token refreshed

**Response schema:** `RefreshTokenResponse`

```json
{
  "access_token": "string",
  "token_type": "Bearer"
}
```

#### `401` — Invalid or expired refresh token

**Response schema:** `Error`

```json
{
  "code": "INVALID_REFRESH_TOKEN",
  "message": "Invalid or expired refresh token",
  "details": "string"
}
```

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`

```json
{
  "message": "Bearer Token is required"
}
```



## 3. `POST /auth/verification-code`

**Summary:** Request a verification code

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `VerificationCodeRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string (email)` | Yes | - |

**Example request:**
```json
{
  "email": "user@example.com"
}
```

### Responses

#### `200` — Verification code requested

No response body.

#### `429` — Too many requests

No response body.

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 4. `POST /auth/verify`

**Summary:** Verify OTP or verification token

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `VerifyTokenRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string (email)` | Yes | - |
| `token` | `string` | Yes | - |
| `token_type` | `string` | No | Allowed: OTP, EMAIL_VERIFICATION, PASSWORD_RESET |

**Example request:**
```json
{
  "email": "user@example.com",
  "token": "string",
  "token_type": "OTP"
}
```

### Responses

#### `200` — Token verified

No response body.

#### `400` — Invalid request

**Response schema:** `Error`


```json
{
  "code": "string",
  "message": "string",
  "details": "string"
}
```

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 5. `POST /auth/password/reset`

**Summary:** Reset password

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `PasswordResetRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string (email)` | Yes | - |
| `token` | `string` | Yes | - |
| `new_password` | `string (password)` | Yes | - |

**Example request:**
```json
{
  "email": "user@example.com",
  "token": "string",
  "new_password": "string"
}
```

### Responses

#### `200` — Password reset successfully

No response body.

#### `400` — Invalid request

**Response schema:** `Error`


```json
{
  "code": "string",
  "message": "string",
  "details": "string"
}
```

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Users

## 1. `GET /users/me`

**Summary:** Get current user profile

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.


### Request Body

No request body.

### Responses

#### `200` — Current user

**Response schema:** `User`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `PATCH /users/me`

**Summary:** Update current user profile

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `UserUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fullname` | `string` | No | - |
| `phone` | `string` | No | - |
| `picture_path` | `string` | No | - |

**Example request:**
```json
{
  "fullname": "string",
  "phone": "string",
  "picture_path": "string"
}
```

### Responses

#### `200` — Profile updated

**Response schema:** `User`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Admin

## 1. `GET /users`

**Summary:** List users

**Description:** Admin-only user management endpoint.

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `page` | `query` | `integer` | No | - |
| `page_size` | `query` | `integer` | No | - |
| `role` | `query` | `RoleName` | No | - |
| `status` | `query` | `UserStatus` | No | - |


### Request Body

No request body.

### Responses

#### `200` — Users

**Response schema:** `PaginatedUsers`


```json
{
  "data": [],
  "pagination": "string"
}
```

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `POST /users`

**Summary:** Create a user

**Description:** Admin-only user creation.

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `AdminUserCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fullname` | `string` | Yes | - |
| `email` | `string (email)` | Yes | - |
| `password` | `string (password)` | Yes | - |
| `phone` | `string` | No | - |
| `role_id` | `string (uuid)` | No | - |

### Responses

#### `201` — User created

**Response schema:** `User`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 3. `GET /users/{userId}`

**Summary:** Get a user

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `userId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `200` — User

**Response schema:** `User`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 4. `PATCH /users/{userId}`

**Summary:** Update a user

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `userId` | `path` | `string (uuid)` | Yes | - |

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `AdminUserUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fullname` | `string` | No | - |
| `phone` | `string` | No | - |
| `picture_path` | `string` | No | - |
| `role_id` | `string (uuid)` | No | - |
| `status` | `UserStatus` | No | Allowed: ACTIVE, DEACTIVATED |

**Example request:**
```json
{
  "fullname": "string",
  "phone": "string",
  "picture_path": "string",
  "role_id": "00000000-0000-0000-0000-000000000000",
  "status": "ACTIVE"
}
```

### Responses

#### `200` — User updated

**Response schema:** `User`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 5. `DELETE /users/{userId}`

**Summary:** Deactivate a user

**Description:** Deactivates the account rather than physically deleting it.

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `userId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `204` — User deactivated

No response body.

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Places

## 1. `GET /places`

**Summary:** List places

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `page` | `query` | `integer` | No | - |
| `page_size` | `query` | `integer` | No | - |
| `status` | `query` | `string` | No | - |


### Request Body

No request body.

### Responses

#### `200` — Places

**Response schema:** `PaginatedPlaces`


```json
{
  "data": [],
  "pagination": "string"
}
```

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `POST /places`

**Summary:** Create a place

**Description:** Manager-only place creation.

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `PlaceCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `owner_id` | `string (uuid)` | No | - |
| `place_name` | `string` | Yes | - |
| `status` | `string` | No | - |

**Example request:**
```json
{
  "owner_id": "00000000-0000-0000-0000-000000000000",
  "place_name": "string",
  "status": "string"
}
```

### Responses

#### `201` — Place created

**Response schema:** `Place`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 3. `GET /places/{placeId}`

**Summary:** Get a place

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `placeId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `200` — Place

**Response schema:** `Place`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 4. `PATCH /places/{placeId}`

**Summary:** Update a place

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `placeId` | `path` | `string (uuid)` | Yes | - |

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `PlaceUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `place_name` | `string` | No | - |
| `status` | `string` | No | - |

**Example request:**
```json
{
  "place_name": "string",
  "status": "string"
}
```

### Responses

#### `200` — Place updated

**Response schema:** `Place`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 5. `DELETE /places/{placeId}`

**Summary:** Delete a place

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `placeId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `204` — Place deleted

No response body.

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Assets

## 1. `GET /places/{placeId}/assets`

**Summary:** List assets for a place

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `placeId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `200` — Assets

**Response schema:** `array<Asset>`

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `POST /places/{placeId}/assets`

**Summary:** Add an asset

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `placeId` | `path` | `string (uuid)` | Yes | - |

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `AssetCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | - |
| `type` | `string` | Yes | - |
| `purchase_date` | `string (date)` | No | - |
| `status` | `string` | No | - |

**Example request:**
```json
{
  "name": "string",
  "type": "string",
  "purchase_date": "2026-01-01",
  "status": "string"
}
```

### Responses

#### `201` — Asset created

**Response schema:** `Asset`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 3. `GET /assets/{assetId}`

**Summary:** Get an asset

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `assetId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `200` — Asset

**Response schema:** `Asset`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 4. `PATCH /assets/{assetId}`

**Summary:** Update an asset

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `assetId` | `path` | `string (uuid)` | Yes | - |

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `AssetUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | No | - |
| `type` | `string` | No | - |
| `purchase_date` | `string (date)` | No | - |
| `status` | `string` | No | - |

**Example request:**
```json
{
  "name": "string",
  "type": "string",
  "purchase_date": "2026-01-01",
  "status": "string"
}
```

### Responses

#### `200` — Asset updated

**Response schema:** `Asset`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 5. `DELETE /assets/{assetId}`

**Summary:** Delete an asset

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `assetId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `204` — Asset deleted

No response body.

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Maintenance

## 1. `GET /assets/{assetId}/maintenance-schedules`

**Summary:** List periodic maintenance schedules

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `assetId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `200` — Maintenance schedules

**Response schema:** `array<PeriodicMaintenance>`

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `POST /assets/{assetId}/maintenance-schedules`

**Summary:** Schedule periodic maintenance

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `assetId` | `path` | `string (uuid)` | Yes | - |

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `PeriodicMaintenanceCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | `string` | Yes | - |
| `frequency` | `MaintenanceFrequency` | Yes | Allowed: MONTHLY, QUARTERLY, YEARLY |
| `next_due_date` | `string (date)` | Yes | - |

**Example request:**
```json
{
  "description": "string",
  "frequency": "MONTHLY",
  "next_due_date": "2026-01-01"
}
```

### Responses

#### `201` — Schedule created

**Response schema:** `PeriodicMaintenance`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 3. `GET /maintenance-tickets`

**Summary:** List maintenance tickets

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `page` | `query` | `integer` | No | - |
| `page_size` | `query` | `integer` | No | - |
| `place_id` | `query` | `string (uuid)` | No | - |
| `asset_id` | `query` | `string (uuid)` | No | - |
| `status` | `query` | `MaintenanceStatus` | No | - |
| `ticket_type` | `query` | `TicketType` | No | - |


### Request Body

No request body.

### Responses

#### `200` — Maintenance tickets

**Response schema:** `PaginatedMaintenanceTickets`


```json
{
  "data": [],
  "pagination": "string"
}
```

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 4. `POST /maintenance-tickets`

**Summary:** Submit a maintenance ticket

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `multipart/form-data`

**Schema:** `object`

| Field | Type | Required | Description |
|---|---|---|---|
| `place_id` | `string (uuid)` | Yes | - |
| `asset_id` | `string (uuid)` | No | - |
| `ticket_type` | `TicketType` | Yes | Allowed: CORRECTIVE, PREVENTIVE |
| `description` | `string` | Yes | - |
| `photo` | `string (binary)` | No | - |

**Example request:**
```json
{
  "place_id": "00000000-0000-0000-0000-000000000000",
  "asset_id": "00000000-0000-0000-0000-000000000000",
  "ticket_type": "CORRECTIVE",
  "description": "string",
  "photo": "string"
}
```

### Responses

#### `201` — Ticket created

**Response schema:** `MaintenanceTicket`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 5. `GET /maintenance-tickets/{ticketId}`

**Summary:** Get a maintenance ticket

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `ticketId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `200` — Ticket

**Response schema:** `MaintenanceTicket`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 6. `POST /maintenance-tickets/{ticketId}/approve`

**Summary:** Approve a maintenance ticket

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.


### Request Body

No request body.

### Responses

#### `200` — Ticket approved

**Response schema:** `MaintenanceTicket`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 7. `POST /maintenance-tickets/{ticketId}/reject`

**Summary:** Reject a maintenance ticket

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** No

#### `application/json`

**Schema:** `object`

| Field | Type | Required | Description |
|---|---|---|---|
| `reason` | `string` | No | - |

**Example request:**
```json
{
  "reason": "string"
}
```

### Responses

#### `200` — Ticket rejected

**Response schema:** `MaintenanceTicket`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 8. `POST /maintenance-tickets/{ticketId}/complete`

**Summary:** Complete a maintenance ticket

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** No

#### `multipart/form-data`

**Schema:** `object`

| Field | Type | Required | Description |
|---|---|---|---|
| `completion_note` | `string` | No | - |
| `photo` | `string (binary)` | No | - |

**Example request:**
```json
{
  "completion_note": "string",
  "photo": "string"
}
```

### Responses

#### `200` — Ticket completed

**Response schema:** `MaintenanceTicket`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Bookings

## 1. `GET /places/{placeId}/bookings`

**Summary:** List bookings for a place

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `placeId` | `path` | `string (uuid)` | Yes | - |
| `from` | `query` | `string (date)` | No | - |
| `to` | `query` | `string (date)` | No | - |


### Request Body

No request body.

### Responses

#### `200` — Bookings

**Response schema:** `array<Booking>`

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `POST /places/{placeId}/bookings`

**Summary:** Add a booking

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `placeId` | `path` | `string (uuid)` | Yes | - |

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `BookingCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `booking_date` | `string (date)` | Yes | - |
| `cost` | `number (double)` | Yes | - |

**Example request:**
```json
{
  "booking_date": "2026-01-01",
  "cost": 0
}
```

### Responses

#### `201` — Booking created

**Response schema:** `Booking`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 3. `GET /bookings/{bookingId}`

**Summary:** Get a booking

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `bookingId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `200` — Booking

**Response schema:** `Booking`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 4. `POST /bookings/{bookingId}`

**Summary:** Cancel a booking

**Description:** The source model specifies cancel() but does not specify whether cancellation is PUT/PATCH/DELETE; POST is used here as a proposed command endpoint.

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `bookingId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `200` — Booking cancelled

**Response schema:** `Booking`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Expenses

## 1. `GET /places/{placeId}/expenses`

**Summary:** List expenses

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `placeId` | `path` | `string (uuid)` | Yes | - |
| `from` | `query` | `string (date)` | No | - |
| `to` | `query` | `string (date)` | No | - |


### Request Body

No request body.

### Responses

#### `200` — Expenses

**Response schema:** `array<Expense>`

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `POST /places/{placeId}/expenses`

**Summary:** Add an expense

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `placeId` | `path` | `string (uuid)` | Yes | - |

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `ExpenseCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | `string` | Yes | - |
| `amount` | `number (double)` | Yes | - |
| `expense_date` | `string (date)` | Yes | - |

**Example request:**
```json
{
  "description": "string",
  "amount": 0,
  "expense_date": "2026-01-01"
}
```

### Responses

#### `201` — Expense created

**Response schema:** `Expense`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 3. `GET /expenses/{expenseId}`

**Summary:** Get an expense

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `expenseId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `200` — Expense

**Response schema:** `Expense`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 4. `PATCH /expenses/{expenseId}`

**Summary:** Update an expense

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `expenseId` | `path` | `string (uuid)` | Yes | - |

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `ExpenseUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | `string` | No | - |
| `amount` | `number (double)` | No | - |
| `expense_date` | `string (date)` | No | - |

**Example request:**
```json
{
  "description": "string",
  "amount": 0,
  "expense_date": "2026-01-01"
}
```

### Responses

#### `200` — Expense updated

**Response schema:** `Expense`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 5. `DELETE /expenses/{expenseId}`

**Summary:** Delete an expense

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `expenseId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `204` — Expense deleted

No response body.

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Reports

## 1. `GET /reports/financial`

**Summary:** Generate financial report

**Description:** Returns total income, total expenses, and profit. The source specifies these metrics but does not define the income data model.

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `from` | `query` | `string (date)` | No | - |
| `to` | `query` | `string (date)` | No | - |
| `place_id` | `query` | `string (uuid)` | No | - |


### Request Body

No request body.

### Responses

#### `200` — Financial report

**Response schema:** `FinancialReport`


```json
{
  "total_income": 0,
  "total_expenses": 0,
  "profit": 0
}
```

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `GET /reports/analytics`

**Summary:** Get reporting and analytics

**Description:** Admin-oriented statistics and filterable data for export.

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `from` | `query` | `string (date)` | No | - |
| `to` | `query` | `string (date)` | No | - |
| `metric` | `query` | `string` | No | - |


### Request Body

No request body.

### Responses

#### `200` — Analytics data

**Response schema:** `AnalyticsResponse`

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Notifications

## 1. `GET /notifications`

**Summary:** List current user's notifications

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.


### Request Body

No request body.

### Responses

#### `200` — Notifications

**Response schema:** `array<Notification>`

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `POST /notifications`

**Summary:** Send notification

**Description:** Admin notification endpoint. Supports a target user, multiple users, or a role.

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `NotificationCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `user_ids` | `array<string (uuid)>` | No | - |
| `role_id` | `string (uuid)` | No | - |
| `message` | `string` | Yes | - |

**Example request:**
```json
{
  "user_ids": [],
  "role_id": "00000000-0000-0000-0000-000000000000",
  "message": "string"
}
```

### Responses

#### `201` — Notification sent

No response body.

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 3. `POST /notifications/{notificationId}/read`

**Summary:** Mark notification as read

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `notificationId` | `path` | `string (uuid)` | Yes | ID of the notification to mark as read |


### Request Body

No request body.

### Responses

#### `200` — Notification marked as read

**Response schema:** `Notification`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Support

## 1. `GET /support-tickets`

**Summary:** List support tickets

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.


### Request Body

No request body.

### Responses

#### `200` — Support tickets

**Response schema:** `array<SupportTicket>`

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `POST /support-tickets`

**Summary:** Submit a support ticket

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `SupportTicketCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `subject` | `string` | Yes | - |
| `description` | `string` | Yes | - |

**Example request:**
```json
{
  "subject": "string",
  "description": "string"
}
```

### Responses

#### `201` — Support ticket created

**Response schema:** `SupportTicket`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 3. `GET /support-tickets/{ticketId}`

**Summary:** Get a support ticket

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `ticketId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `200` — Support ticket

**Response schema:** `SupportTicket`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 4. `PATCH /support-tickets/{ticketId}`

**Summary:** Update support ticket status

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `ticketId` | `path` | `string (uuid)` | Yes | - |

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `object`

| Field | Type | Required | Description |
|---|---|---|---|
| `status` | `SupportTicketStatus` | Yes | Allowed: OPEN, IN_PROGRESS, RESOLVED |

**Example request:**
```json
{
  "status": "OPEN"
}
```

### Responses

#### `200` — Support ticket updated

No response body.

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Web Content

## 1. `GET /content`

**Summary:** List web content

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.


### Request Body

No request body.

### Responses

#### `200` — Published web content

**Response schema:** `array<WebContent>`

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 2. `POST /content`

**Summary:** Create web content

**Description:** Admin-only CMS operation.

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `WebContentCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | - |
| `slug` | `string` | Yes | - |
| `body` | `string` | Yes | - |
| `is_published` | `boolean` | No | Default: `False` |

**Example request:**
```json
{
  "title": "string",
  "slug": "string",
  "body": "string",
  "is_published": false
}
```

### Responses

#### `201` — Content created

**Response schema:** `WebContent`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 3. `GET /content/{contentId}`

**Summary:** Get web content

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `contentId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `200` — Web content

**Response schema:** `WebContent`


#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 4. `PATCH /content/{contentId}`

**Summary:** Update web content

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `contentId` | `path` | `string (uuid)` | Yes | - |

### Request Body

**Required:** Yes

#### `application/json`

**Schema:** `WebContentUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | No | - |
| `slug` | `string` | No | - |
| `body` | `string` | No | - |
| `is_published` | `boolean` | No | - |

**Example request:**
```json
{
  "title": "string",
  "slug": "string",
  "body": "string",
  "is_published": false
}
```

### Responses

#### `200` — Content updated

No response body.

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 5. `DELETE /content/{contentId}`

**Summary:** Delete web content

**Authentication:** Required (Bearer JWT)


### Parameters

| Name | Location | Type | Required | Description |
|---|---|---|---|---|
| `contentId` | `path` | `string (uuid)` | Yes | - |


### Request Body

No request body.

### Responses

#### `204` — Content deleted

No response body.

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

## 6. `POST /content/{contentId}/publish`

**Summary:** Publish web content

**Authentication:** Required (Bearer JWT)


### Parameters

No path/query/header parameters.


### Request Body

No request body.

### Responses

#### `200` — Content published

No response body.

#### `403` — Bearer Token is required.

**Response schema:** `ErrorResponse`


```json
{
  "message": "Bearer Token is required"
}
```

---

# Data Models / Schemas

The following schemas are used by the endpoints above.

## `RoleName`

**Allowed values:** `ADMIN`, `MANAGER`, `WORKER`, `USER`

## `UserStatus`

**Allowed values:** `ACTIVE`, `DEACTIVATED`

## `TicketType`

**Allowed values:** `CORRECTIVE`, `PREVENTIVE`

## `MaintenanceStatus`

Status values are not explicitly enumerated in the source requirements; these are proposed API values.

**Allowed values:** `SUBMITTED`, `APPROVED`, `REJECTED`, `IN_PROGRESS`, `COMPLETED`

## `MaintenanceFrequency`

**Allowed values:** `MONTHLY`, `QUARTERLY`, `YEARLY`

## `SupportTicketStatus`

**Allowed values:** `OPEN`, `IN_PROGRESS`, `RESOLVED`

## `BaseEntity`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |

## `User`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `email` | `string (email)` | Yes | - |
| `phone` | `string` | No | - |
| `fullname` | `string` | Yes | - |
| `picture_path` | `string` | No | - |
| `role_id` | `string (uuid)` | Yes | - |
| `role` | `RoleName` | No | Allowed: ADMIN, MANAGER, WORKER, USER |
| `status` | `UserStatus` | Yes | Allowed: ACTIVE, DEACTIVATED |

## `Role`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `name` | `string` | Yes | - |
| `description` | `string` | No | - |
| `permissions` | `array<Permission>` | No | - |

## `Permission`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `name` | `string` | No | - |
| `description` | `string` | No | - |

## `Place`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `owner_id` | `string (uuid)` | Yes | - |
| `place_name` | `string` | Yes | - |
| `status` | `string` | Yes | - |

## `Asset`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `place_id` | `string (uuid)` | Yes | - |
| `name` | `string` | Yes | - |
| `type` | `string` | Yes | - |
| `purchase_date` | `string (date)` | No | - |
| `status` | `string` | Yes | - |

## `PeriodicMaintenance`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `asset_id` | `string (uuid)` | Yes | - |
| `description` | `string` | Yes | - |
| `frequency` | `MaintenanceFrequency` | Yes | Allowed: MONTHLY, QUARTERLY, YEARLY |
| `next_due_date` | `string (date)` | Yes | - |

## `MaintenanceTicket`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `place_id` | `string (uuid)` | Yes | - |
| `asset_id` | `string (uuid)` | No | - |
| `ticket_type` | `TicketType` | Yes | Allowed: CORRECTIVE, PREVENTIVE |
| `reporter_id` | `string (uuid)` | Yes | - |
| `description` | `string` | Yes | - |
| `status` | `MaintenanceStatus` | Yes | Status values are not explicitly enumerated in the source requirements; these are proposed API values. Allowed: SUBMITTED, APPROVED, REJECTED, IN_PROGRESS, COMPLETED |
| `photo_url` | `string (uri)` | No | - |

## `PlaceChecklist`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `place_id` | `string (uuid)` | Yes | - |
| `checklist_item` | `string` | Yes | - |
| `is_completed` | `boolean` | Yes | - |

## `Booking`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `place_id` | `string (uuid)` | Yes | - |
| `booking_date` | `string (date)` | Yes | - |
| `cost` | `number (double)` | Yes | - |

## `Expense`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `place_id` | `string (uuid)` | Yes | - |
| `description` | `string` | Yes | - |
| `amount` | `number (double)` | Yes | - |
| `expense_date` | `string (date)` | Yes | - |

## `VerificationToken`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `user_id` | `string (uuid)` | Yes | - |
| `token` | `string` | Yes | - |
| `token_type` | `string` | Yes | Allowed: OTP, PASSWORD_RESET, EMAIL_VERIFICATION |
| `expires_at` | `string (date-time)` | Yes | - |
| `is_used` | `boolean` | Yes | - |

## `Notification`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `user_id` | `string (uuid)` | Yes | - |
| `sender_id` | `string (uuid)` | No | - |
| `message` | `string` | Yes | - |
| `is_read` | `boolean` | Yes | - |

## `FinancialReport`

| Field | Type | Required | Description |
|---|---|---|---|
| `total_income` | `number (double)` | Yes | - |
| `total_expenses` | `number (double)` | Yes | - |
| `profit` | `number (double)` | Yes | - |

## `SupportTicket`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `user_id` | `string (uuid)` | Yes | - |
| `subject` | `string` | Yes | - |
| `description` | `string` | Yes | - |
| `status` | `SupportTicketStatus` | Yes | Allowed: OPEN, IN_PROGRESS, RESOLVED |

## `WebContent`

| Field | Type | Required | Description |
|---|---|---|---|
| `id` | `string (uuid)` | Yes | - |
| `created_at` | `string (date-time)` | Yes | - |
| `updated_at` | `string (date-time)` | Yes | - |
| `author_id` | `string (uuid)` | Yes | - |
| `title` | `string` | Yes | - |
| `slug` | `string` | Yes | - |
| `body` | `string` | Yes | - |
| `is_published` | `boolean` | Yes | - |

## `RegisterRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fullname` | `string` | Yes | - |
| `email` | `string (email)` | Yes | - |
| `password` | `string (password)` | Yes | - |
| `phone` | `string` | No | - |

## `LoginRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string (email)` | Yes | - |
| `password` | `string (password)` | Yes | - |

## `AuthResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `access_token` | `string` | No | - |
| `token_type` | `string` | No | - |
| `user` | `User` | No | - |

## `VerificationCodeRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string (email)` | Yes | - |

## `VerifyTokenRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string (email)` | Yes | - |
| `token` | `string` | Yes | - |
| `token_type` | `string` | No | Allowed: OTP, EMAIL_VERIFICATION, PASSWORD_RESET |

## `PasswordResetRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `email` | `string (email)` | Yes | - |
| `token` | `string` | Yes | - |
| `new_password` | `string (password)` | Yes | - |

## `UserUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fullname` | `string` | No | - |
| `phone` | `string` | No | - |
| `picture_path` | `string` | No | - |

## `AdminUserCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fullname` | `string` | Yes | - |
| `email` | `string (email)` | Yes | - |
| `password` | `string (password)` | Yes | - |
| `phone` | `string` | No | - |
| `role_id` | `string (uuid)` | No | - |

## `AdminUserUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `fullname` | `string` | No | - |
| `phone` | `string` | No | - |
| `picture_path` | `string` | No | - |
| `role_id` | `string (uuid)` | No | - |
| `status` | `UserStatus` | No | Allowed: ACTIVE, DEACTIVATED |

## `PlaceCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `owner_id` | `string (uuid)` | No | - |
| `place_name` | `string` | Yes | - |
| `status` | `string` | No | - |

## `PlaceUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `place_name` | `string` | No | - |
| `status` | `string` | No | - |

## `AssetCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | Yes | - |
| `type` | `string` | Yes | - |
| `purchase_date` | `string (date)` | No | - |
| `status` | `string` | No | - |

## `AssetUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | No | - |
| `type` | `string` | No | - |
| `purchase_date` | `string (date)` | No | - |
| `status` | `string` | No | - |

## `PeriodicMaintenanceCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | `string` | Yes | - |
| `frequency` | `MaintenanceFrequency` | Yes | Allowed: MONTHLY, QUARTERLY, YEARLY |
| `next_due_date` | `string (date)` | Yes | - |

## `ChecklistCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `checklist_item` | `string` | Yes | - |
| `is_completed` | `boolean` | No | Default: `False` |

## `ChecklistUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `checklist_item` | `string` | No | - |
| `is_completed` | `boolean` | No | - |

## `BookingCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `booking_date` | `string (date)` | Yes | - |
| `cost` | `number (double)` | Yes | - |

## `ExpenseCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | `string` | Yes | - |
| `amount` | `number (double)` | Yes | - |
| `expense_date` | `string (date)` | Yes | - |

## `ExpenseUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `description` | `string` | No | - |
| `amount` | `number (double)` | No | - |
| `expense_date` | `string (date)` | No | - |

## `NotificationCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `user_ids` | `array<string (uuid)>` | No | - |
| `role_id` | `string (uuid)` | No | - |
| `message` | `string` | Yes | - |

## `SupportTicketCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `subject` | `string` | Yes | - |
| `description` | `string` | Yes | - |

## `WebContentCreateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | Yes | - |
| `slug` | `string` | Yes | - |
| `body` | `string` | Yes | - |
| `is_published` | `boolean` | No | Default: `False` |

## `WebContentUpdateRequest`

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | `string` | No | - |
| `slug` | `string` | No | - |
| `body` | `string` | No | - |
| `is_published` | `boolean` | No | - |

## `Pagination`

| Field | Type | Required | Description |
|---|---|---|---|
| `page` | `integer` | No | - |
| `page_size` | `integer` | No | - |
| `total` | `integer` | No | - |
| `total_pages` | `integer` | No | - |

## `PaginatedUsers`

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `array<User>` | No | - |
| `pagination` | `Pagination` | No | - |

## `PaginatedPlaces`

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `array<Place>` | No | - |
| `pagination` | `Pagination` | No | - |

## `PaginatedMaintenanceTickets`

| Field | Type | Required | Description |
|---|---|---|---|
| `data` | `array<MaintenanceTicket>` | No | - |
| `pagination` | `Pagination` | No | - |

## `AnalyticsResponse`

Flexible analytics response because the source requirements do not define individual metrics.

## `Error`

| Field | Type | Required | Description |
|---|---|---|---|
| `code` | `string` | No | - |
| `message` | `string` | Yes | - |
| `details` | `object` | No | - |

## `ErrorResponse`

| Field | Type | Required | Description |
|---|---|---|---|
| `message` | `string` | Yes | - |

## Common HTTP Status Codes

| Code | Meaning |
|---|---|
| `200` | Successful request |
| `201` | Resource created |
| `204` | Successful request with no response body |
| `400` | Invalid request |
| `401` | Authentication required / invalid JWT |
| `403` | Missing/invalid authorization or insufficient permissions |
| `404` | Resource not found |
| `409` | Conflict, such as duplicate email |
| `429` | Too many requests |

## Swagger / OpenAPI

This README documents the same API contract represented by the OpenAPI YAML file. The YAML can be imported directly into Swagger Editor or Swagger UI to obtain the interactive Swagger interface.
