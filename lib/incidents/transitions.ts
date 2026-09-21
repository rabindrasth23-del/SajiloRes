import "server-only";

/**
 * Allowed status transitions for incidents.status per TRD §7.
 *
 * Key = current status, Value = set of allowed target statuses.
 *
 * Modifications from the user's proposal:
 * - None: the proposed map is used as-is.
 *
 * Terminal statuses (resolved, rejected, false_report) have no outgoing transitions.
 */
export const INCIDENT_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  new: new Set([
    "reviewed",
    "duplicate_review",
    "location_missing",
    "rejected",
    "false_report",
  ]),
  reviewed: new Set([
    "approved",
    "duplicate_review",
    "location_missing",
    "rejected",
    "false_report",
  ]),
  location_missing: new Set(["reviewed", "approved", "rejected", "false_report"]),
  duplicate_review: new Set(["reviewed", "rejected", "false_report"]),
  approved: new Set([
    "acknowledged",
    "assigned",
    "notification_failed",
    "escalation_required",
  ]),
  notification_failed: new Set([
    "approved",
    "acknowledged",
    "assigned",
    "escalation_required",
  ]),
  escalation_required: new Set(["acknowledged", "assigned"]),
  acknowledged: new Set(["assigned", "dispatched", "resolved"]),
  assigned: new Set(["acknowledged", "dispatched", "resolved"]),
  dispatched: new Set(["resolved"]),
  // Terminal statuses — no outgoing transitions
  resolved: new Set(),
  rejected: new Set(),
  false_report: new Set(),
};

/**
 * Targets that the POST /api/incidents/[id]/status route may set.
 * Other targets belong to assign, approve, agent, escalate routes.
 */
export const STATUS_ROUTE_ALLOWED_TARGETS = new Set([
  "acknowledged",
  "dispatched",
  "resolved",
  "rejected",
  "false_report",
  "location_missing",
]);

/**
 * Check if a status transition is valid.
 */
export function isValidTransition(
  currentStatus: string,
  targetStatus: string
): boolean {
  const allowed = INCIDENT_TRANSITIONS[currentStatus];
  if (!allowed) return false;
  return allowed.has(targetStatus);
}

/**
 * Map incident status to the corresponding assignment status.
 * Used when a status change should cascade to active assignments.
 */
export function getAssignmentStatusForIncident(
  incidentStatus: string
): string | null {
  switch (incidentStatus) {
    case "acknowledged":
      return "acknowledged";
    case "dispatched":
      return "dispatched";
    case "resolved":
      return "completed";
    default:
      return null;
  }
}
