export const FRONTEND_TRANSITIONS: Record<string, ReadonlySet<string>> = {
  new: new Set(["reviewed", "duplicate_review", "location_missing", "rejected", "false_report"]),
  reviewed: new Set(["approved", "duplicate_review", "location_missing", "rejected", "false_report"]),
  location_missing: new Set(["reviewed", "approved", "rejected", "false_report"]),
  duplicate_review: new Set(["reviewed", "rejected", "false_report"]),
  approved: new Set(["acknowledged", "assigned", "notification_failed", "escalation_required"]),
  notification_failed: new Set(["approved", "acknowledged", "assigned", "escalation_required"]),
  escalation_required: new Set(["acknowledged", "assigned"]),
  acknowledged: new Set(["assigned", "dispatched", "resolved"]),
  assigned: new Set(["acknowledged", "dispatched", "resolved"]),
  dispatched: new Set(["resolved"]),
  resolved: new Set(),
  rejected: new Set(),
  false_report: new Set(),
};

export interface ActionAvailability {
  enabled: boolean;
  reason: string;
}

export interface IncidentState {
  status: string;
  ai_status: string;
  hasUnresolvedDuplicate: boolean;
}

// NOTE: We assume flags are handled elsewhere or passed in. 
// For this pure function, we evaluate structural rules based on state.
export function getActionAvailability(
  action: "approve" | "modify" | "duplicate" | "reject" | "request_info",
  state: IncidentState,
  role: string | null,
  flags: { [key: string]: boolean } = {}
): ActionAvailability {
  const isTerminal = ["resolved", "rejected", "false_report"].includes(state.status);

  switch (action) {
    case "approve":
      if (!flags.approve) {
        return { enabled: false, reason: "Backend not connected yet" };
      }
      if (!FRONTEND_TRANSITIONS[state.status]?.has("approved")) {
        return { enabled: false, reason: `Cannot approve from status: ${state.status}` };
      }
      return { enabled: true, reason: "" };

    case "reject":
      if (!FRONTEND_TRANSITIONS[state.status]?.has("rejected")) {
        return { enabled: false, reason: `Cannot reject from status: ${state.status}` };
      }
      return { enabled: true, reason: "" };

    case "modify":
      if (isTerminal) {
        return { enabled: false, reason: "Cannot modify a closed incident" };
      }
      return { enabled: true, reason: "" };

    case "duplicate":
      if (!state.hasUnresolvedDuplicate) {
        return { enabled: false, reason: "No potential duplicate flagged" };
      }
      if (isTerminal) {
        return { enabled: false, reason: "Incident is already closed" };
      }
      return { enabled: true, reason: "" };

    case "request_info":
      if (!flags["request-more-information"]) {
        return { enabled: false, reason: "Backend not connected yet" };
      }
      if (isTerminal) {
        return { enabled: false, reason: "Cannot request info on a closed incident" };
      }
      return { enabled: true, reason: "" };

    default:
      return { enabled: false, reason: "Unknown action" };
  }
}
