# SajiloResQ Frontend Context

## Hard Rules
- **DO NOT MODIFY**: `app/api/**`, `supabase/**`, `lib/agent/**`, `lib/ai/**`, `lib/auth/**`, `scripts/**`.
- **Backend Changes**: If a backend change is needed, append to `docs/BACKEND_REQUESTS.md` and use a feature flag. Never invent an endpoint.
- **Supabase Client**: Never use the service role key or import `lib/supabase/server.ts` in frontend code. Browser code uses `lib/supabase/client.ts` only.
- **Enums**: Use enum values exactly as defined in `lib/supabase/database.types.ts`.
- **API**: Use only APIs that exist in this repo's installed Next.js version. App Router only.
- **Design Tokens**: Do not copy design values from memory. Take tokens and behaviors from the UI spec.

## Backend Facts
- Citizens are anonymous. They only use:
  - `POST /api/uploads/sign`
  - `POST /api/incidents`
  - `GET /api/incidents/[id]?client_id=...`
- Staff sign in with Supabase Auth (email/password) via the browser client. Call API routes with `Authorization: Bearer <access_token>`.
- Browser client can read operational tables directly via Supabase client (SELECT policies) and subscribe to Realtime. All writes go through API routes.

## Existing Endpoints Shape

### 1. `POST /api/incidents`
**Request Body**:
```json
{
  "client_id": "string",
  "raw_text": "string",
  "incident_type": "string?",
  "latitude": "number?",
  "longitude": "number?",
  "location_text": "string?",
  "location_source": "gps | typed | map_selection | none",
  "offline_created": "boolean",
  "attachment_paths": [
    {
      "storage_path": "string",
      "mime_type": "string",
      "size_bytes": "number"
    }
  ]
}
```
**Response (200)**:
```json
{
  "incident_id": "string",
  "status": "new",
  "duplicate": "boolean"
}
```

### 2. `GET /api/incidents` (Staff only)
**Query Parameters**: `status` (array), `triage` (array), `limit` (number), `cursor` (string, base64 encoded)
**Response (200)**:
```json
{
  "data": [
    {
      "id": "string",
      "status": "string",
      "triage": "string",
      "incident_type": "string",
      "raw_text": "string",
      "summary": "string",
      "latitude": "number",
      "longitude": "number",
      "location_text": "string",
      "created_at": "string",
      "updated_at": "string",
      "ai_status": "string",
      "verification_status": "string",
      "confidence": "number",
      "needs_human_review": "boolean"
    }
  ],
  "next_cursor": "string | null",
  "count": "number"
}
```

### 3. `GET /api/incidents/[id]`
**Citizen (needs `?client_id=...`) Response**:
```json
{
  "id": "string",
  "status": "string",
  "verification_status": "string",
  "created_at": "string",
  "updated_at": "string"
}
```
**Staff (needs Bearer token) Response**: Returns full incident row (`*`).

### 4. `GET /api/incidents/[id]/events` (Staff only)
**Response (200)**:
```json
{
  "data": [
    {
      "id": "string",
      "incident_id": "string",
      "event_type": "string",
      "actor_role": "string",
      "actor_id": "string",
      "payload": "object",
      "created_at": "string"
    }
  ]
}
```

### 5. `POST /api/uploads/sign`
**Request Body**:
```json
{
  "client_id": "string",
  "mime_type": "string",
  "size_bytes": "number"
}
```
**Response (200)**:
```json
{
  "storage_path": "string",
  "signed_url": "string",
  "token": "string"
}
```

### 6. `GET /api/responders/nearby` (Staff only)
**Query Parameters**: `lat`, `lng`, `serviceTypes` (array)
**Response (200)**:
```json
{
  "data": [
    {
      "id": "string",
      "organization": "string",
      "service_type": "string",
      "contact_person": "string",
      "phone": "string",
      "email": "string",
      "latitude": "number",
      "longitude": "number",
      "coverage_area": "object",
      "distance_km": "number"
    }
  ]
}
```

## Enum Lists (from database.types.ts)
- **Triage**: `"immediate" | "delayed" | "minor" | "unknown"`
- **Incident Types**: `"building_collapse" | "flood_landslide" | "fire" | "medical" | "road_blockage" | "other"`
- **Location Source**: `"gps" | "typed" | "map_selection" | "none"`
- **AI Status**: `"pending" | "processing" | "completed" | "failed"`

## Feature Flags and Not-Built Endpoints
The following features are gated behind flags in `lib/features.ts` (all default `false`) with a disabled state and tooltip "Backend not connected yet":
- `approve`
- `notes`
- `request-more-information`
- `escalate`
- `notification-send-retry`
- `admin-invite-user`
