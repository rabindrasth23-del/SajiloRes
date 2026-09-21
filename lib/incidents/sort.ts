export interface SortableIncident {
  id: string;
  triage: string | null;
  status: string;
  created_at: string | null;
}

const isAcknowledged = (status: string) => {
  return ["acknowledged", "dispatched", "resolved"].includes(status);
};

const getSortGroup = (incident: SortableIncident): number => {
  if (incident.triage === "immediate") {
    return isAcknowledged(incident.status) ? 2 : 1;
  }
  if (!incident.triage) {
    return 3;
  }
  if (incident.triage === "delayed") {
    return 4;
  }
  if (incident.triage === "unknown") {
    return 5;
  }
  if (incident.triage === "minor") {
    return 6;
  }
  return 7; // Fallback
};

export const sortIncidents = <T extends SortableIncident>(incidents: T[]): T[] => {
  return [...incidents].sort((a, b) => {
    const groupA = getSortGroup(a);
    const groupB = getSortGroup(b);

    if (groupA !== groupB) {
      return groupA - groupB;
    }

    // Within group: newest first
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });
};

export const isUnacknowledgedImmediate = (triage: string | null | undefined, status: string | undefined): boolean => {
  return triage === "immediate" && !["acknowledged", "dispatched", "resolved", "rejected", "false_report"].includes(status || "");
};
