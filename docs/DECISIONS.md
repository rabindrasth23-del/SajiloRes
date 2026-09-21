# SajiloResQ — Design Decisions Record

Settled decisions that affect implementation but do **not** require schema changes.
Established during the backend checkpoint. Reference this file before writing API routes or frontend code.

---

## 1. POST /api/incidents Response Status

`POST /api/incidents` returns `status: "new"` (not `"received"`).
The `incidents` table stores `status = 'new'` at creation — there is no `"received"` enum value in the schema.

## 2. Incident Status vs AI Status

At creation: `incidents.status = 'new'`, `ai_status = 'pending'`.

- The `ai_status` column (`pending → processing → completed | failed`) tracks the AI pipeline independently.
- The `status` enum value `'ai_pending'` is **unused** — do not set it. After successful AI extraction, `status` transitions directly from `'new'` to `'reviewed'`.
- If AI fails, `status` stays `'new'` and `ai_status = 'failed'`.

## 3. Attachment Upload Flow

1. Client calls `POST /api/uploads/sign` → server returns a `storage_path` and a signed upload URL.
2. Client uploads the file directly to Supabase Storage using the signed URL.
3. Client includes `attachment_paths: string[]` (not `attachment_ids`) in the `POST /api/incidents` body.
4. The create-incident route inserts `attachments` rows **after** the `incidents` row exists, linking each `storage_path` to the new `incident_id`.

## 4. Incident Type Stored Values

The `incident_type` column accepts these stored values:

| Value | Label |
|---|---|
| `building_collapse` | Building Collapse |
| `flood_landslide` | Flood / Landslide |
| `fire` | Fire |
| `medical` | Medical Emergency |
| `road_blockage` | Road Blockage |
| `other` | Other |

- The citizen's selection is stored first (at creation).
- If the AI or a human changes `incident_type`, the change is logged as an `incident_events` row with `event_type = 'type_changed'` and `payload` containing `{ "from": "...", "to": "..." }`.

## 5. Responder Notes and Resolution Notes

There is no dedicated `notes` column. Notes are stored as `incident_events` rows:

| event_type | Purpose |
|---|---|
| `note_added` | Free-text responder note attached to an incident |
| `resolution_note` | Note recorded at resolution time |

Both carry the note text in `payload.text`.

## 6. Visibility Scope (MVP)

**All staff see all incidents.** There is no organization-based scoping in the MVP.
The RLS SELECT policy for responder/coordinator/admin returns all rows.
Organization-based scoping is a post-MVP feature.

## 7. Location Source Allowed Values

The `location_source` column accepts exactly these values (enforced by CHECK constraint):

| Value | Meaning |
|---|---|
| `gps` | Browser Geolocation API |
| `typed` | User typed a text description |
| `map_selection` | User tapped/clicked a map |
| `none` | No location provided |

## 8. Write Path Architecture

**All writes to operational tables go through Next.js API route handlers using the service_role key.** The browser only READs via RLS + Supabase Realtime.

| Table Group | Browser Access | Server Access |
|---|---|---|
| incidents, incident_events, attachments, notifications, assignments, incident_duplicates | SELECT only (RLS) | Full CRUD (service_role) |
| organizations, responders, app_users, notification_preferences | SELECT (responder+), admin CRUD (RLS) | Full CRUD (service_role) |

## 9. Auth Provisioning

No auto-provisioning trigger. `app_users` rows are created only by:
- An admin via the admin UI (which uses admin-only RLS INSERT policy), or
- Direct SQL (service_role / Supabase dashboard).

New Supabase Auth signups do **not** automatically get an `app_users` row. A user without an `app_users` row has zero RLS access.
