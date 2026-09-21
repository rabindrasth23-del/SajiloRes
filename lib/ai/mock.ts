import type { AIProvider, IncidentAIInput, IncidentAssessment } from "./provider";

// Track provider calls for concurrency testing
let _callCount = 0;
export function _getCallCount(): number {
  return _callCount;
}
export function _resetCallCount(): void {
  _callCount = 0;
}

/**
 * Mock AI Provider — deterministic, for dev/testing only.
 *
 * Default: returns a valid assessment derived from selectedType and keywords.
 * Special tokens in rawText trigger scripted behavior.
 */
export class MockAIProvider implements AIProvider {
  async analyzeIncident(
    input: IncidentAIInput,
    signal?: AbortSignal
  ): Promise<IncidentAssessment> {
    _callCount++;
    const text = input.rawText;

    // ── [[mock:timeout]] — hang longer than AI timeout ──
    if (text.includes("[[mock:timeout]]")) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 30_000);
        if (signal) {
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          });
        }
      });
      // If we get here (no abort), return a valid response
      return this.buildDefault(input);
    }

    // ── [[mock:slow]] — wait 3s then succeed ──
    if (text.includes("[[mock:slow]]")) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, 3000);
        if (signal) {
          signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          });
        }
      });
      return this.buildDefault(input);
    }

    // ── [[mock:invalid_json]] — return text that won't parse ──
    if (text.includes("[[mock:invalid_json]]")) {
      throw new Error("MOCK_INVALID_JSON:not a json {{{");
    }

    // Check abort signal before proceeding
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    // Small delay to simulate network
    await new Promise((r) => setTimeout(r, 50));

    // ── [[mock:bad_triage]] — returns invalid triage ──
    if (text.includes("[[mock:bad_triage]]")) {
      // Return raw object that will fail schema validation
      const result = this.buildDefault(input);
      // Force invalid triage via type assertion
      return { ...result, triage: "critical" as IncidentAssessment["triage"] };
    }

    // ── [[mock:low_confidence]] — confidence 0.3 ──
    if (text.includes("[[mock:low_confidence]]")) {
      return { ...this.buildDefault(input), confidence: 0.3 };
    }

    // ── [[mock:no_review]] — needs_human_review false with immediate ──
    if (text.includes("[[mock:no_review]]")) {
      return {
        ...this.buildDefault(input),
        triage: "immediate",
        confidence: 0.95,
        needsHumanReview: false,
      };
    }

    // ── [[mock:fake_duplicate]] — random UUID in possibleDuplicateIds ──
    if (text.includes("[[mock:fake_duplicate]]")) {
      return {
        ...this.buildDefault(input),
        possibleDuplicateIds: ["deadbeef-dead-4ead-beef-deadbeefbeef"],
      };
    }

    // ── [[mock:bad_services]] — includes invalid service types ──
    if (text.includes("[[mock:bad_services]]")) {
      return {
        ...this.buildDefault(input),
        recommendedServiceTypes: ["ambulance", "aliens", "mayor"],
      };
    }

    // ── [[mock:odd_type]] — incident_type "space_invasion" ──
    if (text.includes("[[mock:odd_type]]")) {
      return { ...this.buildDefault(input), incidentType: "space_invasion" };
    }

    // ── [[mock:low_loc_conf]] — locationConfidence 0.4 (below 0.5 threshold) ──
    if (text.includes("[[mock:low_loc_conf]]")) {
      return { ...this.buildDefault(input), locationConfidence: 0.4, triage: "delayed", confidence: 0.82 };
    }

    // ── [[mock:exact_loc_conf]] — locationConfidence exactly 0.5 (at threshold, NOT below) ──
    if (text.includes("[[mock:exact_loc_conf]]")) {
      return { ...this.buildDefault(input), locationConfidence: 0.5, triage: "delayed", confidence: 0.82 };
    }

    return this.buildDefault(input);
  }

  private buildDefault(input: IncidentAIInput): IncidentAssessment {
    const type = input.selectedType || "other";

    // Derive triage from keywords
    let triage: IncidentAssessment["triage"] = "delayed";
    const lower = input.rawText.toLowerCase();
    if (
      lower.includes("trapped") ||
      lower.includes("collapse") ||
      lower.includes("fire") ||
      lower.includes("flood")
    ) {
      triage = "immediate";
    } else if (lower.includes("minor") || lower.includes("small")) {
      triage = "minor";
    }

    // Derive hazards from keywords
    const hazards: string[] = [];
    if (lower.includes("collapse")) hazards.push("unstable_structure");
    if (lower.includes("fire")) hazards.push("fire_hazard");
    if (lower.includes("flood")) hazards.push("rising_water");
    if (lower.includes("blocked") || lower.includes("blockage"))
      hazards.push("blocked_road");

    // Service types from incident type
    const serviceMap: Record<string, string[]> = {
      building_collapse: ["rescue", "ambulance"],
      flood_landslide: ["rescue", "ambulance"],
      fire: ["fire", "ambulance"],
      medical: ["ambulance"],
      road_blockage: ["police"],
      other: ["coordinator"],
    };

    return {
      incidentType: type,
      triage,
      confidence: 0.82,
      summary: `Mock assessment: ${input.rawText.substring(0, 100)}`,
      peopleAffected: lower.includes("injured") ? 3 : null,
      hazards,
      locationText: input.locationText || null,
      locationConfidence: input.latitude ? 0.85 : 0.2,
      evidence: [`reported: "${input.rawText.substring(0, 80)}"`],
      missingInformation: input.latitude
        ? []
        : ["exact location not provided"],
      possibleDuplicateIds: [],
      recommendedAction: `Deploy ${(serviceMap[type] || ["coordinator"]).join(" and ")} to the reported location.`,
      recommendedServiceTypes: serviceMap[type] || ["coordinator"],
      needsHumanReview: triage === "immediate",
    };
  }
}
