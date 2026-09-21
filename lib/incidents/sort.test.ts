import { describe, it, expect } from "vitest";
import { isUnacknowledgedImmediate } from "./sort";

describe("isUnacknowledgedImmediate", () => {
  it("returns true for immediate triage and new status", () => {
    expect(isUnacknowledgedImmediate("immediate", "new")).toBe(true);
  });

  it("returns true for immediate triage and reviewed status", () => {
    expect(isUnacknowledgedImmediate("immediate", "reviewed")).toBe(true);
  });

  it("returns false for immediate triage and acknowledged status", () => {
    expect(isUnacknowledgedImmediate("immediate", "acknowledged")).toBe(false);
  });

  it("returns false for immediate triage and dispatched status", () => {
    expect(isUnacknowledgedImmediate("immediate", "dispatched")).toBe(false);
  });

  it("returns false for immediate triage and resolved status", () => {
    expect(isUnacknowledgedImmediate("immediate", "resolved")).toBe(false);
  });

  it("returns false for immediate triage and rejected status", () => {
    expect(isUnacknowledgedImmediate("immediate", "rejected")).toBe(false);
  });

  it("returns false for non-immediate triage", () => {
    expect(isUnacknowledgedImmediate("delayed", "new")).toBe(false);
    expect(isUnacknowledgedImmediate("minor", "new")).toBe(false);
    expect(isUnacknowledgedImmediate(null, "new")).toBe(false);
  });
});
