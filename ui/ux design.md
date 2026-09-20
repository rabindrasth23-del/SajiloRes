# SajiloResQ — UI/UX Design Specification (v2, Build-Ready)

**Version:** 2.0 · **Supersedes:** 03_UI_UX_DESIGN.md (v1.0)
**Reader:** an AI coding agent implementing React/Next.js components + Tailwind CSS.

---

## 1. Design Direction

SajiloResQ must feel **calm, trustworthy, fast, and operational** — a serious emergency-coordination product, not a flashy AI chat app.

- **Name:** SajiloResQ
- **Tagline:** Every report. Faster response. No report lost.
- **Descriptor:** Nepal's offline-first AI disaster-response coordination agent.
- **Tone:** Clear, calm, respectful, action-oriented. Never alarmist in copy, even for Immediate incidents — urgency is conveyed by color, order, and icon, not panic language.

---

## 2. Design Tokens

### 2.1 Color

```css
:root {
  --navy: #071A2B;      /* backgrounds, headers, trust */
  --teal: #0F766E;      /* primary brand / actions */
  --cyan: #22D3EE;      /* highlights, connectivity indicators */
  --cloud: #F6F9FC;      /* page background */
  --ink: #102A43;        /* primary text on light surfaces */
  --white: #FFFFFF;      /* card background */
  --mist: #D9E2EC;       /* borders, dividers */

  --immediate: #DC2626;  /* red — life threat */
  --delayed: #D97706;    /* amber — serious, not life-threatening */
  --minor: #15803D;      /* green — limited damage */
  --review: #7C3AED;     /* purple — unknown / needs review */
}
```

Tailwind theme extension:
```js
// tailwind.config.js (excerpt)
colors: {
  navy: "#071A2B",
  teal: "#0F766E",
  cyan: "#22D3EE",
  cloud: "#F6F9FC",
  ink: "#102A43",
  mist: "#D9E2EC",
  immediate: "#DC2626",
  delayed: "#D97706",
  minor: "#15803D",
  review: "#7C3AED",
}
```

**Rule:** never rely on color alone. Every status uses color + icon + text label together (accessibility requirement, §14). Verify 4.5:1 contrast for body text, 3:1 for large text/UI components.

### 2.2 Typography
- **Heading:** Plus Jakarta Sans or Manrope (Google Fonts).
- **Body:** Inter.
- **Nepali text:** Noto Sans Devanagari.
- Body text: 16px minimum. Button text: 14–16px semibold. Dashboard metric numbers: 24–32px, bold.
- Avoid long paragraphs inside emergency cards — prefer short labeled lines over prose.

### 2.3 Spacing, radius, sizing
- 8px base spacing scale (8/16/24/32/48/64).
- Card border radius: 12–16px.
- Primary button height: ≥48px. All touch targets: ≥44px.
- Desktop dashboard max content width: 1440px.
- Mobile citizen flow: strictly single column, sticky bottom action bar for the primary CTA (Next/Submit).

### 2.4 Motion
- Fade-in for new cards/lists (150–250ms ease-out).
- Pulse animation reserved **only** for active/unacknowledged Immediate incidents — nowhere else.
- Smooth status transitions (e.g., a status badge changing color/label cross-fades, doesn't hard-cut).
- No large spinning loaders, no decorative gradients, no parallax. Skeleton loaders for data-loading states.

---

## 3. Information Architecture

```
Landing (/)
├── Report an emergency        → /report
├── Open responder dashboard   → /dashboard  (auth required)
├── How it works (in-page anchor)
└── Safety and limitations (in-page anchor)

Citizen flow (/report)
├── Step 1: Incident type
├── Step 2: Description (text + optional voice)
├── Step 3: Photo + Location
├── Step 4: Review and submit
└── Step 5: Confirmation / status

Responder dashboard (/dashboard, auth required)
├── Top bar (brand, connection, role, demo badge)
├── Metrics row
├── Left: Incident queue
├── Center: Map / satellite
├── Right: Agent recommendation panel
└── → Incident detail (/incident/[id])

Admin (/admin, admin role only)
├── Responder directory (add/edit/disable)
├── Organizations
├── Users and roles
└── Settings (thresholds, escalation timer)
```

---

## 4. Landing Page (`/`)

**Hero**
- Headline: "When disaster happens, every second and every report matters."
- Subtext: "SajiloResQ turns citizen reports into explainable, coordinated response actions—even when the network is unreliable."
- Primary CTA button: **Report an emergency** (teal, links to `/report`)
- Secondary CTA button: **Open responder dashboard** (outlined, links to `/dashboard`)
- Background: deep navy (`--navy`) with a subtle animated map-grid/contour-line SVG pattern — low opacity, no distracting motion.
- Hero visual: three floating status cards, each clearly labeled **"Demo simulation"**:
  - "2 reports processed"
  - "1 responder notified"
  - "Offline queue synchronized"

**Trust section:** four feature cards — Offline-first · Explainable AI · Human-approved alerts · Map-based coordination. Each: icon, 4–6 word title, one-sentence description.

**Footer / safety section:** plain-language limitations statement (see PRD §14) and a link to a `/safety` or in-page anchor explaining the product is advisory, not a replacement for emergency services.

---

## 5. Citizen Report Flow (`/report`)

Mobile-first, single column, large touch targets, minimal reading required (must be usable by a child).

**Persistent elements across all steps:**
- Top: logo, language toggle (English / नेपाली), `ConnectionBadge`.
- Bottom: sticky primary action button.
- A short privacy note visible near the location step: what data is collected and why.

**Step 1 — Incident type**
Large icon+label buttons, minimum 44px height, 2-column grid on mobile:
- 🏚️ Earthquake / Collapse
- 🌊 Flood / Landslide
- 🔥 Fire
- 🚑 Medical Emergency
- 🚧 Road Blockage
- ➕ Other

Selecting one enables "Next." "Other" still proceeds normally, free text carries the detail.

**Step 2 — Description**
- Prompt: "What happened? Include people affected, danger, and a nearby landmark if you know it."
- Large `<textarea>`, placeholder text, soft character guidance (not a hard limit shown to the user, though the field enforces max 2000 chars).
- Optional microphone button → speech-to-text fills/appends to the textarea; user can still edit after.

**Step 3 — Photo + Location**
- "Add photo" (camera or file picker, optional).
- "Use my location" button → triggers GPS permission request, non-blocking (user can continue while pending).
- "Choose on map" alternative (tap-to-pin) if GPS is denied/unavailable.
- "Type a landmark" free-text fallback.
- Live status line shows current `location_source`: `GPS ready`, `Map pin set`, `Typed location`, or `Location unavailable`.

**Step 4 — Review and submit**
Summary card showing: incident type, description (truncated with "edit" link back), location status, attachment status (thumbnail if photo attached), connection status.
- Sticky button: **Submit report**.

**Step 5 — Confirmation**
- Online: "Report received. Our system is preparing it for responder review." + Report ID shown.
- Offline: "Saved offline. It will be sent automatically when connection returns." (calm styling — **not** red/error, use neutral navy/teal with a cloud/offline icon) + locally-generated Report ID shown immediately.
- Always show the report ID (client-generated if offline, server-confirmed once synced) so a citizen can reference it.

---

## 6. Responder Dashboard (`/dashboard`)

**Desktop layout (three columns):**
```
┌─────────────────────────────────────────────────────────┐
│ Top bar: BrandMark | ConnectionBadge | role | Demo badge │
├─────────────────────────────────────────────────────────┤
│ Metrics row (4 compact cards)                            │
├───────────────┬───────────────────────┬──────────────────┤
│ Incident queue │ Map / satellite view  │ Agent panel      │
│ (left, ~28%)   │ (center, ~44%)        │ (right, ~28%)    │
└───────────────┴───────────────────────┴──────────────────┘
```
Mobile/tablet: stack vertically — Metrics → Queue → Map → Agent panel, with a tab or accordion to switch between Queue/Map/Agent to save space if needed.

**Metrics row** (4 compact cards, label each "Demo simulation" if not live-measured):
- Immediate incidents (count)
- Awaiting acknowledgement (count)
- Offline queue (count)
- Average triage time (e.g., "12 sec")

**Left — Incident queue (`IncidentQueue` → list of `IncidentCard`)**
Each `IncidentCard` shows:
- Severity color bar/icon + text label (never color alone).
- Incident type + short one-line summary.
- Approximate location (text or "Location unavailable").
- Time since report (relative, e.g. "3 min ago").
- Verification state badge.
- Assignment state (unassigned / assigned to X).
- Acknowledgement state.

Sort order (fixed, not user-configurable in MVP):
1. Immediate + unacknowledged
2. Immediate + acknowledged
3. Delayed
4. Unknown (needs review)
5. Minor

**Center — Map (`IncidentMap`)**
- Standard/satellite toggle control.
- Severity-colored markers matching the incident colors.
- Legend (small fixed panel: color → label).
- "Center on urgent incidents" button.
- Marker click → popup with incident ID, one-line summary, status, and "Open details" link to `/incident/[id]`.
- Wrapped in an error boundary — on load failure, show `EmptyState`-style inline message ("Map unavailable. Incident list and text location remain available.") without breaking the rest of the dashboard.

**Right — Agent recommendation panel (`AgentRecommendation`)**
Title: **"Sajilo Agent recommendation"**

```
Priority: Immediate
Confidence: 86%

Why:
Possible trapped people, heavy bleeding,
and a blocked access road.

Missing information:
Exact number of trapped people.

Recommended action:
Notify rescue and ambulance; request police
support for road control.

Approval: Pending responder confirmation.
```
Buttons: **Approve alert** · **Modify decision** · **Request information** · **Mark duplicate** · **Reject / mark false**.

This panel is the single most important surface for judges to understand the "agentic" nature of the product — it must always be visible when an incident is selected, never hidden behind a secondary tab.

---

## 7. Incident Detail Page (`/incident/[id]`)

Ordered sections, top to bottom:
1. Status header (incident type, triage badge, verification state, current lifecycle status).
2. Original citizen message (verbatim raw text — always shown, clearly labeled "Original report").
3. AI structured facts (type, people affected, hazards).
4. Evidence and confidence (bulleted evidence list + confidence %).
5. Location and map (small embedded map, or text fallback).
6. Responder recommendations (nearby verified responders with distance/type/availability).
7. Approval and notification state (`NotificationStatusStepper`).
8. Assignment and acknowledgement controls.
9. Event timeline (`AgentTimeline` — full audit history for this incident).
10. Notes and resolution (free-text responder notes + "Mark resolved" action).

---

## 8. Agent Activity Timeline (`AgentTimeline`)

Rendered as a vertical timestamped list, small icon per event type, human-readable label — **never** hidden inside a chatbot-style transcript. Example:

```
11:30:02  Report received
11:30:03  Facts extracted
11:30:03  Immediate priority recommended
11:30:04  Nearby responders found
11:30:05  Alert prepared
11:30:06  Waiting for human approval
11:30:12  Alert approved
```

Event → icon/label mapping should reuse the canonical event types from the AI Agent Spec (`report_received`, `facts_extracted`, `triage_recommended`, `duplicate_check_completed`, `responders_found`, `alert_prepared`, `approval_requested`, `alert_approved`, `notification_sent`, `acknowledgement_received`, `escalation_recommended`, `incident_resolved`).

---

## 9. Status Components

`TriageBadge` and lifecycle status badges always pair color + icon + text:

| Status | Color | Icon | Label |
|---|---|---|---|
| Immediate | Red | alert-triangle | "Immediate" |
| Delayed | Amber | clock | "Delayed" |
| Minor | Green | check-circle | "Minor" |
| Unknown | Purple | help-circle | "Needs review" |
| Pending approval | — (neutral) | hourglass | "Pending approval" |
| Dispatched | Teal | radio | "Dispatched" |
| Resolved | Green | check | "Resolved" |

`ConnectionBadge` (persistent, fixed position, small):
- **Online** (cyan dot)
- **Offline — saving locally** (neutral/navy, not red)
- **Syncing N reports** (animated subtle pulse on the count)
- **All reports synchronized** (brief confirmation state, then collapses back to "Online")

`OfflineQueueBadge` (citizen-side detail, if queue > 0):
```
1 report waiting to send
Created 20 seconds ago
[Retry now]
```
Avoid frightening language such as "Submission failed" for an offline save — it was saved successfully, just not yet transmitted.

---

## 10. Notifications and Escalation UX

`NotificationStatusStepper` renders the pipeline as a horizontal stepper:
```
Prepared → Approved → Sent → Acknowledged → Dispatched
```
Failed state breaks the stepper visually (red segment) with an inline "Retry" action. The UI must never claim "responders notified" unless the provider call actually returned success — the stepper only advances on confirmed server state, never optimistically.

`EscalationTimer` — visible countdown or elapsed indicator on unacknowledged Immediate incidents. On timeout: banner "No acknowledgement yet — escalation recommended," which surfaces a second recommended responder group for coordinator approval (does not auto-send).

---

## 11. Empty, Loading, and Error States

| Situation | Copy |
|---|---|
| Empty queue | "No unassigned Immediate incidents. All critical reports are currently being handled." |
| AI loading | "The agent is extracting incident details…" (skeleton loader, not spinner) |
| AI failure | "Report saved. AI processing is pending. A responder can review the original message." |
| Map failure | "Map unavailable. Incident list and text location remain available." |
| Notification failure | "Alert not sent yet. Retry or choose another verified responder channel." |

Every empty/loading/error state must render actionable UI, never a blank white screen.

---

## 12. Demo-Mode Signaling

- A persistent, small **"DEMO ENVIRONMENT — simulated responder directory"** banner on the dashboard so judges never mistake this for a live emergency service.
- Any metric not actually measured live is labeled **"Demo simulation"** inline, not hidden in fine print.

---

## 13. Recommended Component Inventory

```
BrandMark
ConnectionBadge
LanguageToggle
EmergencyReportForm
IncidentTypeSelector
LocationPicker
TriageBadge
StatusBadge
IncidentCard
IncidentQueue
IncidentMap
AgentRecommendation
AgentTimeline
ResponderDirectoryList
ApprovalDialog
NotificationStatusStepper
OfflineQueueBadge
EscalationTimer
EmptyState
SkeletonLoader
DemoModeBanner
```
Keep these names exactly as listed — the TRD's repo structure references them directly, and consistent naming keeps the AI coding agent's generated code navigable.

---

## 14. Accessibility Checklist (must pass before "done")

- All interactive elements keyboard-reachable in a logical tab order.
- Visible focus states on every button/input (do not remove default outlines without replacing them).
- `aria-label`s on icon-only buttons.
- Status conveyed by color **plus** text/icon, never color alone.
- Touch targets ≥44px.
- Plain-language error messages (no raw error codes shown to citizens).
- No information conveyed by sound alone.
- Nepali (Devanagari) text renders correctly wherever `LanguageToggle` is set to नेपाली.
- Contrast: ≥4.5:1 normal text, ≥3:1 large text and UI components (verify against the token palette above, especially amber/teal on white and white on navy).

---

## 15. Responsive Behavior Summary

| Breakpoint | Citizen flow | Dashboard |
|---|---|---|
| Mobile (<640px) | Single column, sticky bottom CTA | Stacked sections, tabbed Queue/Map/Agent |
| Tablet (640–1024px) | Single column, wider margins | Two-column (Queue+Map stacked, Agent panel as slide-over) |
| Desktop (≥1024px) | Centered single column, max-width ~480px | Full three-column layout, max content width 1440px |

---

## 16. Polish Priorities (only after core workflow works end-to-end)

1. Skeleton loaders replacing any spinner.
2. Consistent icon set (recommend `lucide-react`).
3. Card fade-in transitions.
4. Pulse only on active Immediate alerts.
5. Empty states for every list/panel.
6. Demo-mode banner + "Demo simulation" labels everywhere applicable.
7. Final accessibility pass (§14).

Do not spend time on decorative gradients, large animations, or illustration work before the core citizen→AI→responder→resolution loop is fully working and tested per `08_TESTING_AND_DEMO_v2.md`.