# SajiloResQ — Product Requirements Document (v2, Build-Ready)

**Version:** 2.0
**Supersedes:** 01_PRD.md (v1.0)
**Event:** Yantra Business Cup — SOFTBOTS AI Hackathon 2026
**Theme:** Disaster Response
**Product:** SajiloResQ
**Tagline:** Every report. Faster response. No report lost.
**Intended reader:** an AI coding agent (Claude Opus, via Antigravity) building this app end-to-end, and any human engineer reviewing its output.

> This document is intentionally explicit and unambiguous. Where v1 left a decision implicit, v2 makes a decision and states it as a rule. If the coding agent must choose between two reasonable interpretations, it should follow this document over general judgment, and should leave a `// TODO(spec-gap):` comment rather than silently deciding for anything not covered here.

---

## 1. Executive Summary

SajiloResQ is an offline-first, agentic disaster-response coordination platform for Nepal. A citizen submits a report (text, optional photo, optional voice-to-text, optional GPS). The system extracts structured facts, classifies urgency, checks for duplicates, finds relevant **verified** responder organizations, recommends a next action, and — only after a human responder approves — sends a notification. Acknowledgement, assignment, dispatch, escalation, and resolution are all tracked with a full audit trail.

The product is **advisory and human-supervised**. It never autonomously contacts real emergency services. It is a coordination layer, not a dispatch system.

---

## 2. Problem Statement

During disasters in Nepal, citizen reports are commonly:
- **Incomplete** — missing exact location, missing severity detail.
- **Duplicated** — many people report the same incident independently.
- **Delayed or lost** — sent over unreliable mobile networks.
- **Hard to prioritize** — responders cannot tell at a glance which of 30 reports is life-threatening.

Responders need one operational view that answers, per report: *What happened? Where? How urgent? Who is affected? What hazards exist? Who should respond? Has anyone acknowledged it?*

---

## 3. Users and Personas

| Persona | Role | Primary device | Key need |
|---|---|---|---|
| **Amrita, 34** | Citizen, urban | Low/mid-range Android, patchy 3G/4G | Report in <60s, know it wasn't lost |
| **Bikash, 9** | Citizen, child | Shared family phone | Must be usable with minimal reading — large buttons, icons, short words |
| **Suresh, 41** | Responder — Ambulance dispatcher | Desktop/laptop, office wifi | See Immediate cases first, trust the evidence shown, one-click approve |
| **Nirmala, 29** | Responder — Municipal rescue coordinator | Tablet in the field | Map view, satellite toggle, acknowledge/dispatch on the go |
| **Rajan, 50** | Admin | Desktop | Manage verified responder directory, review audit trail, disable bad contacts |
| **Judge (hackathon)** | Evaluator | Laptop/projector | Understand "agentic-ness" in under 5 minutes; see safety controls |

Roles are enforced in the database and API layer (see TRD §11), never only in the UI.

---

## 4. Product Principles (non-negotiable)

1. **Offline-resilient** — a report must never disappear because the network disappeared.
2. **Human-supervised** — AI recommends; a verified human approves anything that leaves the system (notification, alert).
3. **Explainable** — every triage decision ships with evidence, a confidence score, and a list of missing information.
4. **Simple for citizens** — one obvious path, usable by a child, minimal typing required.
5. **Honest** — the system never claims a notification was sent or a team was dispatched unless a provider confirmed it.
6. **Safe by default** — uncertainty, duplication, or high-impact cases always route to a human.
7. **No invented facts** — the AI may summarize and infer likelihood, but must never fabricate a location, organization, or dispatch outcome.

---

## 5. Goals / Non-Goals

### Goals (for this build)
- Citizen can submit a report in under 60 seconds, with or without connectivity.
- Every report is preserved even if AI, map, or email providers fail.
- Free text becomes structured JSON with an incident type, triage label, confidence, evidence, and a recommended action.
- Duplicate reports are detected and flagged, never silently merged.
- Only **verified** responder directory entries can receive notifications.
- Every consequential action (notify, dispatch) requires human approval and is logged.
- A single, reliable 5-minute demo works twice in a row, including an offline→online cycle.

### Non-Goals (explicitly out of scope for this build)
- Replacing emergency professionals or guaranteeing a response.
- Real integrations with police, hospitals, SMS/WhatsApp gateways, or live phone dispatch.
- Predicting disasters, satellite damage analysis, or route optimization.
- Training or fine-tuning a custom model.
- Multi-agent orchestration frameworks (LangGraph/AutoGen-style multi-agent swarms). One agent, many tools.
- National-scale infra, multi-region deployment, horizontal autoscaling design.
- Full voice conversation UX (voice is speech-to-text only, feeding the same text pipeline).

---

## 6. Scope Freeze — Build Only This

**In scope (MVP, must ship):**
1. Citizen report form: type selector, free text, optional photo, optional GPS, optional voice-to-text.
2. Offline queue (IndexedDB) with idempotent sync via `client_id`.
3. AI extraction + triage (single LLM call per report, JSON-schema validated).
4. Duplicate detection (heuristic: text similarity + geo distance + time window + same category).
5. Verified responder directory + nearby lookup (Haversine distance, no geocoding API needed).
6. Agent recommendation panel with human approve / modify / reject / request-info actions.
7. Notification (Supabase Realtime dashboard alert always; email optional/secondary).
8. Responder dashboard: queue, map, agent panel, acknowledge/assign/dispatch/resolve.
9. Escalation timer for unacknowledged Immediate incidents.
10. Full audit/event log per incident.
11. Map with standard/satellite toggle and severity-colored markers; incident list works even if map fails.

**Explicitly deferred (do not build unless the above is fully working and demoed):**
SMS/WhatsApp, live police/hospital integration, FCM push (optional stretch only), complex routing, weather, voice conversation, custom model training, multi-agent frameworks.

---

## 7. Core User Stories with Acceptance Criteria

### Citizen
- **US-C1**: As a citizen, I can pick an incident type from large icon buttons (Earthquake/Collapse, Flood/Landslide, Fire, Medical, Road Blockage, Other).
  - AC: Selection is required before proceeding to description; selecting "Other" still allows free text.
- **US-C2**: As a citizen, I can describe what happened in plain text, optionally by voice.
  - AC: Text field accepts 1–2000 characters; voice button transcribes into the same field (does not replace it silently — user can edit after transcription).
- **US-C3**: As a citizen, I can attach one photo.
  - AC: JPEG/PNG/WebP only, max 8MB, client-side compressed before upload if possible.
- **US-C4**: As a citizen, I can allow GPS, or type a landmark, or skip location.
  - AC: GPS permission prompt is non-blocking — form remains usable while permission dialog is pending or denied. `location_source` is always recorded as one of `gps | typed | none`.
- **US-C5**: As a citizen, I can submit while offline and get a calm, accurate confirmation.
  - AC: No red "error" styling for offline saves. Message: "Saved offline — will send automatically when you're back online." A locally-generated report ID is shown immediately.
- **US-C6**: As a citizen, I never need to create an account to submit a report.

### Responder
- **US-R1**: Immediate incidents always sort to the top of the queue, unacknowledged-first.
- **US-R2**: I can see the AI's evidence and confidence before I act, not just a label.
- **US-R3**: I can approve, modify, reject, or request more information — the AI never sends anything on its own.
- **US-R4**: I can see nearby **verified** responder organizations with type, distance, and availability.
- **US-R5**: I can acknowledge, assign, mark dispatched, and resolve an incident, and every transition is timestamped and logged.
- **US-R6**: I can see whether a notification was actually sent, and retry if it failed.

### Admin
- **US-A1**: I can add/edit/disable verified responder directory entries (organization, service type, coverage area, verified email, availability, lat/long, contact person).
- **US-A2**: I can view the full audit trail for any incident.
- **US-A3**: I can never let a non-admin edit the responder directory (enforced server-side, not just hidden in UI).

---

## 8. Triage Model

| Label | Color | Meaning | Example evidence |
|---|---|---|---|
| `immediate` | Red `#DC2626` | Life threat, trapped people, severe bleeding, active fire, structural collapse w/ possible occupants | "two people may be trapped", "heavy bleeding", "building on fire" |
| `delayed` | Amber `#D97706` | Serious, not immediately life-threatening | "wall cracked, nobody inside", "road partially blocked" |
| `minor` | Green `#15803D` | Limited damage, no injuries | "small landslide, no one hurt" |
| `unknown` | Purple `#7C3AED` | Insufficient or contradictory evidence | "help near school" with no further detail |

Triage is **advisory only** — never presented as a guarantee, medical diagnosis, or legal determination. `needs_human_review = true` is mandatory whenever triage is `immediate`, confidence is below the configured threshold (default 0.65), a duplicate is suspected, or location is uncertain.

---

## 9. Functional Requirements (numbered, testable)

| ID | Requirement |
|---|---|
| FR-01 | Citizen can submit a report with type, text, optional photo, optional location, without an account. |
| FR-02 | Client generates a UUID `client_id` before any network call; this ID is the idempotency key for the entire lifecycle. |
| FR-03 | If offline or the POST fails, the report is stored in IndexedDB with status `pending` and retried automatically on `online` event, and manually via a "Retry now" control. |
| FR-04 | Server `POST /api/incidents` is idempotent on `client_id` — a duplicate POST with the same `client_id` returns the existing incident, never creates a second row. |
| FR-05 | Raw report text/photo/location is persisted **before** any AI call, so AI failure never loses citizen input. |
| FR-06 | AI processing produces a JSON object matching the schema in the AI Agent Spec; server validates it against a schema (e.g. Zod) before storing; invalid output is rejected and `ai_status` is set to `failed`, never silently stored. |
| FR-07 | If the AI call times out or errors, `ai_status = pending` (queued for manual/automatic retry) and the incident remains visible with raw text only. |
| FR-08 | Duplicate check compares new incident to incidents within a configurable radius (default 500m) and time window (default 6 hours) of the same category, using text similarity (see TRD §5.1) — flags, never auto-merges. |
| FR-09 | Nearby responder lookup filters directory by `service_type`, `available = true`, `verified = true`, sorted by Haversine distance. |
| FR-10 | If zero verified responders are found nearby, the incident is routed to a "regional coordinator" queue instead of silently having no recommendation. |
| FR-11 | No notification is sent without an explicit `approve` action from an authenticated user with role `responder`, `coordinator`, or `admin`. |
| FR-12 | Every notification passes through states `pending → prepared → approved → sending → sent | failed → acknowledged`. Failed notifications are retryable and never delete the underlying incident. |
| FR-13 | Every state-changing action (create, AI classify, approve, send, assign, acknowledge, dispatch, resolve, escalate, correction) appends one row to `incident_events`. |
| FR-14 | Unacknowledged `immediate` incidents trigger an escalation after a configurable timer (demo default: 90 seconds), setting `status = escalation_required` and surfacing a second recommended responder group for coordinator approval. |
| FR-15 | Map failure (script load error, quota, offline tiles) must never hide the incident list or block acknowledge/assign/resolve actions. |
| FR-16 | All destructive/administrative actions (editing the verified responder directory) are restricted to role `admin`, enforced via Supabase Row Level Security, not just UI hiding. |

---

## 10. Data Fallback Matrix

| Missing/failed input | System behavior |
|---|---|
| No GPS | Use typed location text; show "GPS unavailable" badge; `location_source = typed` or `none` |
| No internet | Save report to IndexedDB; sync on reconnect |
| No photo | Continue with text only |
| No responder nearby | Route to regional coordinator queue |
| Low AI confidence (<0.65) | Force `needs_human_review = true`; surface in queue with "Needs review" badge |
| Duplicate suspected | Show "Possible duplicate of Incident #N" banner; ask responder to merge or keep separate |
| AI service unavailable | Save raw report; `ai_status = pending`; show "AI processing pending" |
| Email/notification failure | `notification.status = failed`; show retry control; incident itself is unaffected |

---

## 11. Success Metrics (measure, don't assert)

Only report numbers actually measured in testing; label anything else "simulated."

- Time from form open to successful submit (target: <60s).
- Time from submit to structured triage appearing (target: <10s online).
- Time from triage to responder recommendation (target: <2s, since it's local computation).
- Offline → online sync latency for a queued report.
- Number of duplicate incidents correctly flagged in test set.
- % of `immediate` incidents with a populated evidence list (target: 100%).

---

## 12. Acceptance Criteria for "Done" (MVP)

- A first-time citizen can submit a report in under one minute without instructions.
- The raw report appears in Supabase and on the responder dashboard within 2 seconds (online).
- AI returns schema-valid structured output, or the system visibly falls back to `ai_pending` without losing data.
- Dashboard shows triage, confidence, evidence, and recommended action for every processed incident.
- A report submitted offline survives a page refresh and syncs exactly once on reconnect (no duplicates).
- GPS denial does not block submission.
- Map load failure does not hide the incident queue.
- A responder can complete the full lifecycle: approve → notify → acknowledge → assign → dispatch → resolve.
- Every step above produces a row in `incident_events`, viewable in an audit timeline.
- The full demo (below) runs with zero manual database edits.

---

## 13. Hackathon Demo Scenario

**Scenario:** "A school wall has collapsed near a river. Two children may be trapped. The access road is blocked."

**Sequence:**
1. Submit as citizen (GPS on).
2. Show AI extraction: type, people affected, hazards, triage = Immediate, confidence, evidence.
3. Show duplicate check: "No duplicates found."
4. Show nearby verified responder recommendation (rescue + ambulance + police for road control).
5. Responder approves alert → notification status becomes `sent`.
6. Responder acknowledges → status `acknowledged` → assign → `dispatched`.
7. Switch browser offline, submit a second report → "Saved offline."
8. Restore connection → automatic sync, no duplicate created.
9. Toggle satellite view on the map.
10. Resolve the first incident → show full audit timeline.

---

## 14. Known Limitations (state these to judges proactively)

- Responder directory is demo/simulated data — no real emergency institution is contacted.
- AI triage is advisory, not a medical or legal determination.
- Duplicate detection is heuristic (no embeddings in MVP) and may need human correction.
- Escalation timers are shortened for demo purposes and are clearly labeled as simulated.
- No production-scale load testing has been performed.