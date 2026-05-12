# Label Studio API

Base URL: `http://localhost:3001/api`

All endpoints except `POST /auth/login` and `POST /auth/register` require a `Bearer` token in the `Authorization` header.

```
Authorization: Bearer <token>
```

## Authentication

### POST /auth/register

Create a new user account.

**Request:**
```json
{ "username": "string", "password": "string" }
```

**Response (201):**
```json
{ "token": "jwt-string", "user": { "id": 1, "username": "string", "role": "user" } }
```

**Errors:** `400` (missing fields), `409` (username taken)

---

### POST /auth/login

Authenticate with existing credentials.

**Request:**
```json
{ "username": "string", "password": "string" }
```

**Response (200):**
```json
{ "token": "jwt-string", "user": { "id": 1, "username": "string", "role": "user" } }
```

**Errors:** `401` (invalid credentials)

---

### GET /auth/me

Returns the authenticated user's info from the JWT token.

**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{ "id": 1, "username": "string", "role": "user", "iat": 123, "exp": 456 }
```

---

## Records

All record endpoints require authentication and are scoped to the authenticated user (each user sees only their own records).

### GET /records

List all records for the authenticated user, ordered by `created_at DESC`.

**Response (200):**
```json
[
  {
    "id": 1,
    "code": "INV-001",
    "project": "HQ Renovation",
    "type": "Invoice",
    "date": "1403/02/10",
    "party": "BuildCo",
    "amount": "12,500,000",
    "related": ["CONTRACT-001"],
    "image": "/uploads/123.jpg",
    "color": "#7367f0",
    "user_id": 1,
    "created_at": "2025-05-12 10:00:00",
    "updated_at": "2025-05-12 10:00:00"
  }
]
```

---

### POST /records

Create a new record.

**Request:**
```json
{
  "code": "INV-002",
  "project": "New Project",
  "type": "Invoice",
  "date": "1403/03/01",
  "party": "SomeCo",
  "amount": "5,000,000",
  "related": ["INV-001"],
  "image": "/uploads/abc.jpg",
  "color": "#28c76f"
}
```

Only `code` and `project` are required. All other fields default to empty string or empty array.

**Response (201):** The created record object with server-assigned `id`, `user_id`, and timestamps.

**Errors:** `400` (missing code or project)

---

### PUT /records/:id

Update an existing record. Only the authenticated owner can update.

**Request:** Same body shape as POST (all fields optional — omitted fields keep their current value).

**Response (200):** The updated record object.

**Errors:** `404` (not found or not owned by user)

---

### DELETE /records/batch

Delete multiple records.

**Request:**
```json
{ "ids": [1, 2, 3] }
```

**Response (200):**
```json
{ "deleted": 3 }
```

**Errors:** `400` (empty or missing ids array)

---

### POST /records/reorder

Touch the `updated_at` timestamp on records to reflect a new order (the frontend sends the desired ID order).

**Request:**
```json
{ "ids": [3, 1, 2] }
```

**Response (200):**
```json
{ "ok": true }
```

---

### GET /records/backup

Export all of the authenticated user's records as a JSON array, ordered by `created_at ASC`.

**Response (200):**
```json
[ /* array of record objects */ ]
```

---

### POST /records/restore

Replace all of the authenticated user's records with the provided array (atomic transaction: delete all + insert batch).

**Request:**
```json
{ "records": [ /* array of record objects */ ] }
```

**Response (200):**
```json
{ "ok": true, "count": 5 }
```

**Errors:** `400` (missing or non-array records)

---

## Image Upload

### POST /api/upload-image

Upload a base64-encoded image. Requires authentication.

**Request:**
```json
{ "image": "data:image/png;base64,iVBORw0KGgo..." }
```

**Response (200):**
```json
{ "url": "/uploads/1712345678_1.png" }
```

Supported formats: `png`, `jpg`, `jpeg`, `gif`, `webp`. Max 2MB (enforced client-side; server limit is 10MB via `express.json` limit config).

**Errors:** `400` (missing or invalid image data)

---

## Error Format

All errors return JSON with an `error` field:

```json
{ "error": "Human-readable error message" }
```

HTTP status codes: `400` (bad request), `401` (unauthorized), `404` (not found), `409` (conflict), `500` (internal server error).

## Notes

- The default admin user `admin` is created on first run (password is a placeholder hash — register a new user or update the hash in `server/db.js`).
- The SQLite database file is at `server/data.db`.
- JWT tokens expire after 7 days.
- Records are fully scoped per user via `user_id` foreign key in the `records` table.
