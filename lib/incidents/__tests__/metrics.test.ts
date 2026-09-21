import { describe, it, expect } from "vitest";
import { calculateAverageTriageTime } from "../metrics";

describe("calculateAverageTriageTime", () => {
  it("returns '—' when there is no data", () => {
    expect(calculateAverageTriageTime([])).toBe("—");
    expect(calculateAverageTriageTime([{ incident_id: "1", event_type: "other", created_at: "2026-09-20T10:00:00Z" }])).toBe("—");
  });

  it("calculates average in seconds", () => {
    const events = [
      { incident_id: "1", event_type: "report_received", created_at: "2026-09-20T10:00:00Z" },
      { incident_id: "1", event_type: "triage_recommended", created_at: "2026-09-20T10:00:10Z" }, // 10s
      { incident_id: "2", event_type: "report_received", created_at: "2026-09-20T10:01:00Z" },
      { incident_id: "2", event_type: "triage_recommended", created_at: "2026-09-20T10:01:20Z" }, // 20s
    ];
    // avg = 15s
    expect(calculateAverageTriageTime(events)).toBe("15 sec");
  });

  it("calculates average in minutes when 60s or more", () => {
    const events = [
      { incident_id: "1", event_type: "report_received", created_at: "2026-09-20T10:00:00Z" },
      { incident_id: "1", event_type: "triage_recommended", created_at: "2026-09-20T10:02:00Z" }, // 120s
    ];
    // avg = 120s = 2 min
    expect(calculateAverageTriageTime(events)).toBe("2 min");
  });

  it("handles events out of order safely", () => {
    const events = [
      { incident_id: "1", event_type: "triage_recommended", created_at: "2026-09-20T10:00:10Z" },
      { incident_id: "1", event_type: "report_received", created_at: "2026-09-20T10:00:00Z" },
    ];
    // still 10s even if processed out of order in array
    expect(calculateAverageTriageTime(events)).toBe("10 sec");
  });

  it("ignores negative time deltas (data anomaly)", () => {
    const events = [
      { incident_id: "1", event_type: "report_received", created_at: "2026-09-20T10:00:10Z" },
      { incident_id: "1", event_type: "triage_recommended", created_at: "2026-09-20T10:00:00Z" }, // Triage happened BEFORE received? Invalid.
      { incident_id: "2", event_type: "report_received", created_at: "2026-09-20T10:01:00Z" },
      { incident_id: "2", event_type: "triage_recommended", created_at: "2026-09-20T10:01:20Z" }, // 20s
    ];
    // Incident 1 is ignored. Incident 2 is 20s. Avg = 20s.
    expect(calculateAverageTriageTime(events)).toBe("20 sec");
  });
});
