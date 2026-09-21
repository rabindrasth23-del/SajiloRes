interface IncidentEvent {
  incident_id: string;
  event_type: string;
  created_at: string | null;
}

export function calculateAverageTriageTime(events: IncidentEvent[]): string {
  if (!events || events.length === 0) return "—";

  // Group by incident_id
  const eventsByIncident: Record<string, { received?: Date; triaged?: Date }> = {};

  for (const event of events) {
    if (!event.created_at) continue;
    
    if (!eventsByIncident[event.incident_id]) {
      eventsByIncident[event.incident_id] = {};
    }
    
    if (event.event_type === "report_received") {
      eventsByIncident[event.incident_id].received = new Date(event.created_at);
    } else if (event.event_type === "triage_recommended") {
      eventsByIncident[event.incident_id].triaged = new Date(event.created_at);
    }
  }

  let totalMs = 0;
  let count = 0;

  for (const key in eventsByIncident) {
    const group = eventsByIncident[key];
    if (group.received && group.triaged) {
      const delta = group.triaged.getTime() - group.received.getTime();
      // Handle out-of-order safely (shouldn't happen logically, but guard against it)
      if (delta >= 0) {
        totalMs += delta;
        count++;
      }
    }
  }

  if (count === 0) return "—";

  const avgMs = totalMs / count;
  const avgSec = Math.round(avgMs / 1000);

  if (avgSec < 60) {
    return `${avgSec} sec`;
  }
  return `${Math.round(avgSec / 60)} min`;
}
