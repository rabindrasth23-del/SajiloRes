import { describe, it, expect } from "vitest";
import { sortIncidents, SortableIncident } from "../sort";

describe("sortIncidents", () => {
  it("sorts correctly by groups and then newest first", () => {
    const incidents: SortableIncident[] = [
      { id: "1", triage: "minor", status: "new", created_at: "2026-09-20T10:00:00Z" },
      { id: "2", triage: "immediate", status: "dispatched", created_at: "2026-09-20T10:05:00Z" },
      { id: "3", triage: "immediate", status: "new", created_at: "2026-09-20T10:02:00Z" },
      { id: "4", triage: "delayed", status: "new", created_at: "2026-09-20T10:04:00Z" },
      { id: "5", triage: null, status: "new", created_at: "2026-09-20T10:01:00Z" },
      { id: "6", triage: "unknown", status: "new", created_at: "2026-09-20T10:03:00Z" },
      { id: "7", triage: "immediate", status: "new", created_at: "2026-09-20T10:06:00Z" }, // Newer immediate
    ];

    const sorted = sortIncidents(incidents);
    const sortedIds = sorted.map(i => i.id);

    // Expected Order:
    // 1. Immediate unacknowledged: #7 (newest), #3
    // 2. Immediate acknowledged: #2
    // 3. Triage null: #5
    // 4. Delayed: #4
    // 5. Unknown: #6
    // 6. Minor: #1
    expect(sortedIds).toEqual(["7", "3", "2", "5", "4", "6", "1"]);
  });
});
