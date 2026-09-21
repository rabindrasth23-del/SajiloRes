import { describe, it, expect, vi } from "vitest";

// Mock "server-only" to allow importing backend module
vi.mock("server-only", () => ({}));

import { INCIDENT_TRANSITIONS as BACKEND_TRANSITIONS } from "../transitions";
import { FRONTEND_TRANSITIONS, getActionAvailability } from "../availability";

describe("availability rules", () => {
  it("DRIFT TEST: frontend transitions match backend exactly", () => {
    const backendKeys = Object.keys(BACKEND_TRANSITIONS);
    const frontendKeys = Object.keys(FRONTEND_TRANSITIONS);

    expect(frontendKeys.sort()).toEqual(backendKeys.sort());

    for (const key of backendKeys) {
      const backendSet = BACKEND_TRANSITIONS[key];
      const frontendSet = FRONTEND_TRANSITIONS[key];
      
      const backendArr = Array.from(backendSet).sort();
      const frontendArr = Array.from(frontendSet).sort();
      
      expect(frontendArr).toEqual(backendArr);
    }
  });

  it("checks action availability correctly", () => {
    const state = { status: "new", ai_status: "completed", hasUnresolvedDuplicate: false };
    
    // approve missing flag
    expect(getActionAvailability("approve", state, null, {})).toEqual({ enabled: false, reason: "Backend not connected yet" });
    
    // approve with flag, valid transition
    state.status = "reviewed";
    expect(getActionAvailability("approve", state, null, { approve: true }).enabled).toBe(true);
    
    // duplicate when false
    expect(getActionAvailability("duplicate", state, null, {}).enabled).toBe(false);
    
    // duplicate when true
    state.hasUnresolvedDuplicate = true;
    expect(getActionAvailability("duplicate", state, null, {}).enabled).toBe(true);

    // reject valid
    state.status = "new";
    expect(getActionAvailability("reject", state, null, {}).enabled).toBe(true);

    // reject invalid
    state.status = "resolved";
    expect(getActionAvailability("reject", state, null, {}).enabled).toBe(false);
  });
});
