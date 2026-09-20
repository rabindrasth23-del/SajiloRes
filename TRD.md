# SajiloResQ — Technical Requirements Document (v2, Build-Ready)

**Version:** 2.0 · **Supersedes:** 02_TRD.md (v1.0)
**Stack:** Next.js 14+ (App Router) + TypeScript + Supabase (Postgres, Auth, Storage, Realtime) + Vercel + GitHub
**Reader:** an AI coding agent building this repository from scratch. This document defines exact schemas, contracts, and file locations so the agent does not need to invent them.

---

## 1. Technical Goals

- Deployable and demo-stable above all else.
- Secrets server-side only; nothing sensitive in `NEXT_PUBLIC_*`.
- AI provider, map provider, and notification provider are each behind a single adapter interface so they can be swapped without touching business logic.
- Offline capture is idempotent — no duplicate incidents, ever, regardless of retry count.
- Every failure has a defined, visible, non-destructive fallback state.
- Minimal infra: no queues, no separate workers, no containers beyond what Vercel/Supabase provide natively.

---

## 2. System Architecture

```
Citizen Browser
├── Next.js UI (App Router, client components for interactive forms)
├── Browser Geolocation API
├── IndexedDB offline queue (via idb-keyval or a thin custom wrapper)
└── Optional Service Worker (background sync — stretch goal only)
        │
        ▼
Vercel / Next.js Server (Route Handlers under app/api/**)
├── Auth + role checks (Supabase Auth JWT verification)
├── AIProvider adapter
├── Agent tool router (server-side function dispatch, NOT client-callable)
├── NotificationProvider adapter
├── Idempotency + audit logic
        │
        ▼
Supabase
├── PostgreSQL (incidents, responders, notifications, incident_events, users, ...)
├── Auth (email/password or magic link for responders/admins)
├── Storage (incident photo attachments)
├── Realtime (dashboard live updates via postgres_changes)
└── Edge Functions (optional — escalation timer sweep, notification retry sweep)
        │
        ├── LLM API (single provider behind AIProvider interface)
        ├── Map provider (Google Maps JS API primary, Leaflet/MapLibre fallback)
        ├── Email provider (Resend or similar, behind NotificationProvider interface)
        └── FCM (optional, stretch only)
```

**Rule for the coding agent:** business logic (validation, authorization, tool execution, idempotency) lives in `app/api/**/route.ts` and `lib/**`, never in client components. Client components only call `fetch` against these routes or Supabase client SDK for reads permitted by RLS.

---

## 3. Service Responsibilities

| Service | Responsibility |
|---|---|
| Next.js | Citizen UI, responder UI, admin UI, all server API routes |
| Vercel | Deployment, preview environments per PR, environment variable management |
| GitHub | Version control, PR review, backup |
| Supabase Postgres | Source of truth for incidents, responders, assignments, notifications, audit events |
| Supabase Auth | Responder/coordinator/admin authentication (citizens remain anonymous) |
| Supabase Storage | Incident photo attachments, private bucket with signed URLs |
| Supabase Realtime | Live dashboard updates (new incident, status change, notification state change) |
| Supabase Edge Functions | *Optional*: escalation sweep (cron), notification retry sweep (cron) |
| LLM API | Structured extraction, triage, recommendation — single call per incident |
| Map provider | Map/satellite rendering, marker placement — **display only**, no geocoding/routing calls in MVP |
| Email provider | Sending approved alerts to verified responder emails |
| FCM | Optional web push — build last, only if everything else is stable |

---

## 4. AI Model Strategy

### 4.1 Provider selection guidance (for the coding agent to confirm with the user before hardcoding)
Use **one** fast, reliable LLM with strict structured-output support (JSON mode or tool-calling with a schema). Recommended candidates, in order of fit for this use case as of the project's design:
- **Anthropic Claude (Sonnet-class model)** via the Messages API with a `tools`-based structured-output pattern, or a strict "return only JSON" system prompt (see AI Agent Spec §4). Good multilingual (English/Nepali) handling, strong instruction-following on safety rules.
- **OpenAI GPT-4o-class model** via `response_format: { type: "json_schema" }` — also a valid choice if the team already has API access.

Pick **one** and implement it behind the `AIProvider` interface below. Do not hardcode a specific vendor SDK call anywhere outside `lib/ai/provider.ts`.

### 4.2 Adapter interface

```ts
// lib/ai/provider.ts
export interface IncidentAIInput {
  rawText: string;
  selectedType?: string;
  latitude?: number;
  longitude?: number;
  locationText?: string;
  photoUrl?: string;
  createdAt: string; // ISO timestamp
  nearbyIncidents: NearbyIncidentSummary[];
  nearbyResponders: ResponderSummary[];
}

export interface IncidentAssessment {
  incidentType: string;
  triage: "immediate" | "delayed" | "minor" | "unknown";
  confidence: number; // 0..1
  summary: string;
  peopleAffected: number | null;
  hazards: string[];
  locationText: string | null;
  locationConfidence: number; // 0..1
  evidence: string[];
  missingInformation: string[];
  possibleDuplicateIds: string[];
  recommendedAction: string;
  recommendedServiceTypes: string[]; // e.g. ["ambulance","rescue","police"]
  needsHumanReview: boolean;
}

export interface AIProvider {
  analyzeIncident(input: IncidentAIInput): Promise<IncidentAssessment>;
}
```

### 4.3 Model routing rules
- Text-only report → fast text model call.
- Report with photo → multimodal call if the chosen provider/model supports vision; otherwise analyze text only and note `"photo_not_analyzed"` in `missingInformation`.
- Voice input → transcribe client-side or via a speech-to-text call **before** hitting `analyzeIncident` — the agent always receives text, never audio.
- Duplicate detection starts as **text/location/time heuristics** (TRD §5.1). Embedding-based similarity is an optional upgrade, not required for MVP.

### 4.4 Forbidden model uses (hard constraints, enforced in the prompt and re-validated server-side)
- Inventing a location, organization, hospital, or dispatch outcome.
- Choosing an unverified/non-directory recipient.
- Claiming a notification was sent or a team was dispatched (that is only ever set by the server after a provider confirms success).
- Overriding a human correction on a later call — corrections are logged and the corrected value is authoritative going forward for that incident.
- Performing any external side effect. The model returns JSON; the server executes tools.

### 4.5 Output validation
Every `IncidentAssessment` returned by the provider is validated server-side with a schema (Zod recommended):
- `triage` must be exactly one of the 4 allowed enum values — anything else is rejected.
- `confidence` and `locationConfidence` must be numbers in `[0, 1]`.
- Reject the entire response (set `ai_status = failed`, preserve raw report) if the JSON does not parse or fails schema validation. Never coerce or guess-fill invalid fields.

---

## 5. Agent Tools

All tools are **server-side functions**, callable only from route handlers — never exposed directly to the browser or to the LLM's own execution environment. The LLM's job is to *recommend* which tool(s) apply and with what arguments (inside its JSON output, e.g. `recommendedServiceTypes`); the **server** decides whether to actually invoke `findNearbyResponders`, `prepareAlert`, etc., validates authorization, and executes.

```ts
createIncident(input: CreateIncidentInput): Promise<{ incidentId: string; duplicate: boolean }>
classifyIncident(incidentId: string): Promise<IncidentAssessment>
checkDuplicateReports(incidentId: string): Promise<{ possibleDuplicateIds: string[] }>
findNearbyResponders(incidentId: string, serviceTypes: string[]): Promise<ResponderSummary[]>
prepareAlert(incidentId: string, responderIds: string[]): Promise<{ notificationIds: string[] }>
requestMoreInformation(incidentId: string, questions: string[]): Promise<void>
approveAlert(incidentId: string, approverId: string): Promise<void>
sendNotification(notificationId: string): Promise<{ status: "sent" | "failed"; error?: string }>
assignResponder(incidentId: string, responderId: string): Promise<void>
updateIncidentStatus(incidentId: string, status: IncidentStatus): Promise<void>
startEscalation(incidentId: string): Promise<void>
appendAuditEvent(incidentId: string, eventType: string, actorId: string | null, payload: object): Promise<void>
```

### 5.1 Duplicate detection heuristic (MVP, no embeddings required)
A candidate incident B is a possible duplicate of new incident A if **all** of the following hold:
1. Same `incident_type` (or both `"other"`).
2. Haversine distance between A and B locations ≤ 500m (configurable `DUPLICATE_RADIUS_M`), **or** both have no location and were reported within the same rough area text.
3. `created_at` within 6 hours of each other (configurable `DUPLICATE_WINDOW_MIN`).
4. Text similarity above threshold — use a simple, dependency-light method for MVP: token-overlap (Jaccard similarity on lowercased, stopword-stripped word sets) ≥ 0.35, OR shared key nouns (hazard/incident keywords extracted by the LLM in `hazards`/`incidentType`) overlap.

Each tool call, and its result, is written to `incident_events`. Duplicates are **never auto-merged** — always surfaced for human decision (`merge` or `keep_separate`).

### 5.2 Tool execution contract
Every tool must:
- Validate its input (types, ranges, referenced IDs exist).
- Check the caller's authorization (role + ownership/organization scope).
- Operate on a specific `incidentId` (no bulk/blind operations).
- Be idempotent where the operation is naturally repeatable (e.g., re-calling `findNearbyResponders` is always safe; `sendNotification` must not re-send an already-`sent` notification — it should short-circuit and return the existing status).
- Write exactly one `incident_events` row describing what happened, including failures.
- Return a typed success or an explicit typed failure — never throw uncaught to the caller. Route handlers catch and translate to the API Error Format (§10.5).
- Respect timeouts: AI calls timeout at 10s, provider notification calls at 8s, both with one automatic retry before surfacing `failed`.

---

## 6. AI JSON Contract (example)

```json
{
  "incident_type": "building_collapse",
  "triage": "immediate",
  "confidence": 0.86,
  "summary": "Possible trapped people after a school wall collapse",
  "people_affected": 2,
  "hazards": ["unstable_structure", "blocked_road"],
  "location_text": "near the river school",
  "location_confidence": 0.7,
  "evidence": [
    "two people may be trapped",
    "collapsed wall",
    "blocked access road"
  ],
  "missing_information": ["exact number of trapped people"],
  "possible_duplicate_ids": [],
  "recommended_action": "Request rescue team and ambulance; coordinate police road control.",
  "recommended_service_types": ["rescue", "ambulance", "police"],
  "needs_human_review": true
}
```

Server-side Zod schema (illustrative — implement exactly this shape):

```ts
import { z } from "zod";

export const IncidentAssessmentSchema = z.object({
  incident_type: z.string().min(1),
  triage: z.enum(["immediate", "delayed", "minor", "unknown"]),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  people_affected: z.number().int().nonnegative().nullable(),
  hazards: z.array(z.string()),
  location_text: z.string().nullable(),
  location_confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  missing_information: z.array(z.string()),
  possible_duplicate_ids: z.array(z.string()),
  recommended_action: z.string().min(1),
  recommended_service_types: z.array(z.string()),
  needs_human_review: z.boolean(),
});
```

---

## 7. Database Schema (PostgreSQL / Supabase)

Use `uuid` primary keys (`gen_random_uuid()` via `pgcrypto`), `timestamptz` for all timestamps, and enable Row Level Security on every table (see §11 and 06_DATABASE_SECURITY_v2.md for policies).

```sql
-- ========== incidents ==========
create table incidents (
  id uuid primary key default gen_random_uuid(),
  client_id text unique not null,               -- idempotency key from browser
  raw_text text not null,
  incident_type text,
  triage text check (triage in ('immediate','delayed','minor','unknown')),
  confidence numeric check (confidence >= 0 and confidence <= 1),
  summary text,
  evidence jsonb default '[]'::jsonb,
  hazards jsonb default '[]'::jsonb,
  missing_information jsonb default '[]'::jsonb,
  people_affected integer,
  latitude numeric,
  longitude numeric,
  location_text text,
  location_source text check (location_source in ('gps','typed','map_selection','none')),
  location_confidence numeric,
  status text not null default 'new' check (status in (
    'new','ai_pending','reviewed','approved','assigned','acknowledged',
    'dispatched','resolved','duplicate_review','rejected','false_report',
    'notification_failed','location_missing','escalation_required'
  )),
  verification_status text not null default 'unverified' check (verification_status in (
    'unverified','ai_reviewed','human_verified','dispatched','resolved','false_or_duplicate'
  )),
  ai_status text not null default 'pending' check (ai_status in ('pending','processing','completed','failed')),
  recommended_action text,
  recommended_service_types jsonb default '[]'::jsonb,
  needs_human_review boolean default true,
  offline_created boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index idx_incidents_status on incidents(status);
create index idx_incidents_triage on incidents(triage);
create index idx_incidents_created_at on incidents(created_at);
create index idx_incidents_location on incidents(latitude, longitude);

-- ========== incident_duplicates ==========
create table incident_duplicates (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) not null,
  possible_duplicate_of uuid references incidents(id) not null,
  similarity_score numeric,
  resolution text check (resolution in ('unresolved','merged','kept_separate')) default 'unresolved',
  resolved_by uuid,
  created_at timestamptz default now()
);

-- ========== organizations ==========
create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

-- ========== responders (directory entries, NOT user accounts) ==========
create table responders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id),
  organization text not null,           -- denormalized display name
  service_type text not null check (service_type in ('ambulance','rescue','police','fire','hospital','coordinator','ngo','volunteer')),
  email text,
  phone text,
  contact_person text,
  latitude numeric,
  longitude numeric,
  coverage_area text,
  available boolean default true,
  verified boolean default false,
  created_at timestamptz default now()
);
create index idx_responders_service_type on responders(service_type);

-- ========== users (auth-linked, for responders/coordinators/admins) ==========
create table app_users (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('responder','coordinator','admin')),
  organization_id uuid references organizations(id),
  display_name text,
  created_at timestamptz default now()
);

-- ========== assignments ==========
create table assignments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) not null,
  responder_id uuid references responders(id) not null,
  assigned_by uuid references app_users(id),
  assigned_at timestamptz default now(),
  status text default 'assigned' check (status in ('assigned','acknowledged','dispatched','completed','cancelled'))
);

-- ========== notifications ==========
create table notifications (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) not null,
  responder_id uuid references responders(id) not null,
  channel text not null check (channel in ('email','dashboard','fcm')),
  status text not null default 'pending' check (status in (
    'pending','prepared','approved','sending','sent','failed','acknowledged','retrying'
  )),
  approved_by uuid references app_users(id),
  sent_at timestamptz,
  acknowledged_at timestamptz,
  provider_message_id text,
  error text,
  retry_count integer default 0,
  created_at timestamptz default now()
);

-- ========== incident_events (audit trail) ==========
create table incident_events (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) not null,
  event_type text not null,   -- e.g. 'report_received','facts_extracted','triage_recommended', etc. (see AI Agent Spec §10)
  actor_id uuid,              -- null when system/AI-generated
  actor_role text,            -- 'citizen' | 'ai' | 'responder' | 'coordinator' | 'admin' | 'system'
  payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create index idx_incident_events_incident_id on incident_events(incident_id);

-- ========== attachments ==========
create table attachments (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid references incidents(id) not null,
  storage_path text not null,     -- Supabase Storage object path
  mime_type text not null,
  size_bytes integer,
  created_at timestamptz default now()
);

-- ========== notification_preferences (admin-configurable, optional) ==========
create table notification_preferences (
  id uuid primary key default gen_random_uuid(),
  responder_id uuid references responders(id) not null,
  channel text not null check (channel in ('email','fcm')),
  enabled boolean default true
);
```

**updated_at trigger:** attach a standard `set_updated_at()` trigger function to `incidents` (and any other mutable table) so `updated_at` is always accurate without relying on application code.

---

## 8. API Routes (Next.js Route Handlers)

All routes live under `app/api/**/route.ts`. All mutating routes require a valid Supabase session **except** `POST /api/incidents` (citizens are anonymous) and `POST /api/incidents/[id]/process` (system/internal, can be triggered by the create route itself or a follow-up client call).

| Method & Path | Auth | Purpose |
|---|---|---|
| `POST /api/incidents` | none (citizen) | Create incident (idempotent on `client_id`) |
| `POST /api/incidents/[id]/process` | none (internal trigger) or service | Run AI extraction + duplicate check + responder lookup |
| `GET /api/incidents` | responder+ | List incidents (filter by status/triage), RLS-scoped |
| `GET /api/incidents/[id]` | responder+ (or citizen w/ own `client_id` for status only) | Incident detail |
| `GET /api/responders/nearby` | responder+ | Query params: `lat, lng, serviceTypes[]` |
| `POST /api/incidents/[id]/approve` | responder+ | Approve AI recommendation → triggers `prepareAlert` + `sendNotification` |
| `POST /api/incidents/[id]/modify` | responder+ | Human overrides triage/action; logged as correction |
| `POST /api/incidents/[id]/assign` | responder+ | Assign a responder |
| `POST /api/incidents/[id]/status` | responder+ | Update lifecycle status (acknowledge/dispatch/resolve/etc.) |
| `POST /api/incidents/[id]/escalate` | coordinator+ | Manually trigger or confirm escalation |
| `POST /api/incidents/[id]/duplicate` | responder+ | Mark `merge` or `keep_separate` for a flagged duplicate pair |
| `POST /api/notifications/[id]/send` | system/internal | Actually call the email/FCM provider |
| `POST /api/notifications/[id]/retry` | responder+ | Retry a failed notification |
| `POST /api/uploads/sign` | none (citizen) | Get a signed Supabase Storage upload URL |
| `GET /api/incidents/[id]/events` | responder+ | Full audit timeline for one incident |

### 8.1 `POST /api/incidents` — contract

Request:
```json
{
  "client_id": "browser-generated-uuid-v4",
  "incident_type": "building_collapse",
  "raw_text": "A wall collapsed near the school",
  "latitude": 27.67,
  "longitude": 85.32,
  "location_text": null,
  "location_source": "gps",
  "attachment_ids": [],
  "offline_created": false
}
```

Response (`200` new, `200` idempotent replay):
```json
{
  "incident_id": "server-uuid",
  "status": "received",
  "duplicate": false
}
```

Server behavior:
1. Look up `incidents` by `client_id`. If found, return the existing record's `id`/`status` immediately (no new row, no duplicate AI call) — this is the idempotency guarantee for offline retries.
2. Otherwise, validate payload (Zod), insert the row with `status='new'`, `ai_status='pending'`, write `incident_events` row `report_received`.
3. Kick off processing (either inline `await` for the demo's sake, or fire a non-blocking call to `/process` — recommend **inline await with a hard 10s timeout** for MVP simplicity and demo reliability; fall back to `ai_status='pending'` on timeout).
4. Return response. The dashboard picks up the new/updated row via Supabase Realtime, no polling required.

### 8.2 Error format (all routes)

```json
{
  "error": {
    "code": "NOTIFICATION_FAILED",
    "message": "The alert could not be sent.",
    "retryable": true,
    "request_id": "uuid"
  }
}
```

Standard `code` values: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `AI_TIMEOUT`, `AI_INVALID_OUTPUT`, `NOTIFICATION_FAILED`, `MAP_UNAVAILABLE`, `RATE_LIMITED`, `INTERNAL_ERROR`.

---

## 9. Offline Synchronization

### 9.1 Client queue record (IndexedDB)

```ts
interface QueuedReport {
  clientId: string;          // uuid v4, generated on form start
  incidentType: string;
  rawText: string;
  latitude?: number;
  longitude?: number;
  locationText?: string;
  locationSource: "gps" | "typed" | "map_selection" | "none";
  attachmentBlobIds: string[]; // stored separately in IndexedDB blob store
  createdAt: string;         // ISO, client clock
  status: "pending" | "sending" | "sent" | "failed";
  retryCount: number;
  lastError?: string;
}
```

### 9.2 Sync algorithm
1. On submit: generate `clientId` (if not already generated at form-start), write `QueuedReport` with `status='pending'` to IndexedDB **immediately**, regardless of connectivity.
2. Attempt `POST /api/incidents` immediately.
   - Success → mark `status='sent'`, remove from queue (or keep with `sent` status briefly for UI confirmation, then prune).
   - Network failure / timeout → leave `status='pending'`, increment nothing yet, show "Saved offline."
3. Register a `window.addEventListener('online', trySyncQueue)` handler.
4. `trySyncQueue()` processes the queue **one item at a time, sequentially** (not in parallel) to keep behavior predictable and avoid overwhelming the API on flaky reconnects. For each item: set `status='sending'`, POST, on success mark `sent` and move to next; on failure increment `retryCount`, set `status='failed'` if `retryCount` exceeds a max (e.g., 5), else back to `pending` for the next trigger.
5. A manual "Retry now" button in the offline queue badge calls `trySyncQueue()` directly.
6. Server-side idempotency (§8.1 step 1) is the real safety net — even if the client somehow double-sends, no duplicate incident is created.
7. On successful reconnect sync, the AI processing step (`/process`) should still run server-side per the normal flow — offline submission does not skip AI triage, it only delays it until the record exists server-side.

---

## 10. Maps and Location

- Use browser Geolocation API directly — no third-party GPS provider.
- Store `latitude`/`longitude` only with explicit user permission; always store `location_source`.
- Primary map: **Google Maps JavaScript API** (restricted API key, by domain + API) with standard/satellite toggle.
- Fallback: **Leaflet + MapLibre / OpenStreetMap tiles** if Google Maps fails to load or the key is unavailable — implement `IncidentMap` so it can switch provider without changing the parent component's props.
- No Geocoding, Directions, or Places APIs in MVP — not needed, avoids cost/complexity/failure surface.
- If the map fails entirely, the incident list/queue remains fully functional (§FR-15) — the map component must fail gracefully inside an error boundary, not crash the page.

---

## 11. Authentication and Authorization

| Role | Can do |
|---|---|
| `citizen` (anonymous) | Create a report; view status of their own report by `client_id` only |
| `responder` | View incidents in their org/coverage scope; approve/modify/reject; assign; acknowledge/dispatch/resolve |
| `coordinator` | Everything a responder can, plus manage escalation and cross-organization visibility within their operational area |
| `admin` | Manage organizations, responders directory, users, and system settings; full audit access |

- Supabase Auth (email/password or magic link) issues sessions for `responder`/`coordinator`/`admin`. Citizens never authenticate.
- **Row Level Security is mandatory** on every table containing incident or responder data (policies detailed in `06_DATABASE_SECURITY_v2.md`).
- The Supabase **service role key** is used only in server route handlers, never sent to the browser, never used in client components.
- Every mutating API route re-checks role server-side — the UI hiding a button is not a security control.

---

## 12. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

AI_PROVIDER=              # "anthropic" | "openai"
AI_API_KEY=
AI_MODEL=                 # e.g. "claude-sonnet-4-x" or "gpt-4o"

NEXT_PUBLIC_MAP_PROVIDER=  # "google" | "leaflet"
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=

EMAIL_PROVIDER=            # "resend" | other
EMAIL_API_KEY=
EMAIL_FROM=

# Optional FCM (stretch only)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_ADMIN_PRIVATE_KEY=

# Tunable thresholds
DUPLICATE_RADIUS_M=500
DUPLICATE_WINDOW_MIN=360
AI_CONFIDENCE_THRESHOLD=0.65
ESCALATION_TIMEOUT_SECONDS=90   # shortened for demo; document as simulated
```

Only variables prefixed `NEXT_PUBLIC_` are ever exposed client-side. Never commit `.env.local`.

---

## 13. Reliability and Failure Handling (canonical table)

| Failure | Behavior |
|---|---|
| Offline | Save locally (IndexedDB), retry on reconnect |
| AI timeout (>10s) or error | Preserve raw report, `ai_status='pending'`, visible "AI processing pending" badge |
| Invalid AI JSON (schema fail) | Reject output, `ai_status='failed'`, flagged for human/automatic retry |
| GPS denied | Use typed location or `location_source='none'`; never block submission |
| Map failure | Show incident list + text coordinates; map component isolated in an error boundary |
| Email/notification failure | `notification.status='failed'`, retry control shown, incident unaffected |
| No nearby responder | Route to regional coordinator queue (`recommended_service_types` still shown) |
| Duplicate suspected | Human chooses merge/keep-separate; both original reports preserved |
| Auth failure on protected route | `401`/`403` with standard error format; block action, do not silently no-op |

---

## 14. Security Requirements

- Server-side secret management via Vercel env vars only.
- Supabase RLS on every table (see §11 and DB/Security doc).
- Input validation (Zod) on every API route; output validation on every AI response.
- Rate limiting on `POST /api/incidents` and `POST /api/notifications/*` (simple per-IP or per-`client_id` token bucket is sufficient for hackathon scale; document the approach even if implemented minimally).
- MIME-type and size validation for uploads (`image/jpeg`, `image/png`, `image/webp`; max 8MB).
- Idempotency for report creation (§8.1).
- Restrict the Google Maps API key by HTTP referrer and by API.
- No sensitive data (raw text with possible names/injury details) in client-side console logs in production builds.
- HTTPS everywhere (Vercel default).

---

## 15. Testing Requirements

At minimum, cover (see `08_TESTING_AND_DEMO_v2.md` for the full matrix): online submission, offline submission + refresh + reconnect, duplicate `client_id` replay, GPS denied, map failure, AI timeout/invalid output, email failure + retry, duplicate-report detection, unauthorized approval attempt, simultaneous updates from two responders, escalation timeout.

---

## 16. Deployment Checklist

1. Push source to GitHub (main branch protected, PR-based workflow recommended even solo, for clean history).
2. Connect repository to Vercel; configure Development/Preview/Production env vars separately.
3. Provision Supabase project; run schema migrations (SQL above) via Supabase CLI or SQL editor.
4. Seed 3 verified demo responder organizations (ambulance, rescue, police) with realistic Nepal coordinates.
5. Seed one resolved incident and one active incident for a non-empty first impression.
6. Test the production URL on two different browsers/devices.
7. Record a backup demo video in case of live-network failure during judging.

---

## 17. Suggested Repository Structure

```
sajiloresq/
  app/
    page.tsx                          -- landing
    report/page.tsx                   -- citizen report flow
    dashboard/page.tsx                -- responder dashboard
    incident/[id]/page.tsx            -- incident detail
    admin/responders/page.tsx         -- admin directory management
    api/
      incidents/route.ts
      incidents/[id]/route.ts
      incidents/[id]/process/route.ts
      incidents/[id]/approve/route.ts
      incidents/[id]/modify/route.ts
      incidents/[id]/assign/route.ts
      incidents/[id]/status/route.ts
      incidents/[id]/escalate/route.ts
      incidents/[id]/duplicate/route.ts
      incidents/[id]/events/route.ts
      responders/nearby/route.ts
      notifications/[id]/send/route.ts
      notifications/[id]/retry/route.ts
      uploads/sign/route.ts
  components/
    BrandMark.tsx
    ConnectionBadge.tsx
    LanguageToggle.tsx
    EmergencyReportForm.tsx
    IncidentTypeSelector.tsx
    LocationPicker.tsx
    TriageBadge.tsx
    IncidentCard.tsx
    IncidentQueue.tsx
    IncidentMap.tsx
    AgentRecommendation.tsx
    AgentTimeline.tsx
    ResponderDirectoryList.tsx
    ApprovalDialog.tsx
    NotificationStatusStepper.tsx
    OfflineQueueBadge.tsx
    EscalationTimer.tsx
    EmptyState.tsx
  lib/
    supabase/client.ts                -- browser client (anon key)
    supabase/server.ts                -- server client (service role, server-only)
    ai/provider.ts                    -- AIProvider interface + chosen implementation
    ai/prompt.ts                      -- system prompt + schema
    agent/tools.ts                    -- all agent tool implementations
    agent/duplicate.ts                -- duplicate heuristic
    offline/queue.ts                  -- IndexedDB queue logic
    notifications/provider.ts         -- NotificationProvider interface + email impl
    validation/schemas.ts             -- all Zod schemas
    auth/roles.ts                     -- role-check helpers
    geo/haversine.ts
  supabase/
    migrations/*.sql
    seed.sql
  docs/
    01_PRD_v2.md
    02_TRD_v2.md
    03_UI_UX_DESIGN_v2.md
    ...
```