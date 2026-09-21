import "server-only";

import { z } from "zod";
import type { IncidentAssessment } from "./provider";

/**
 * Snake_case Zod schema for AI JSON output — TRD §6
 * Validates the raw JSON the provider returns.
 */
export const IncidentAssessmentSchema = z.object({
  incident_type: z.string().min(1),
  triage: z.enum(["immediate", "delayed", "minor", "unknown"]),
  confidence: z.number().min(0).max(1),
  summary: z.string().min(1),
  people_affected: z.number().int().nonnegative().nullable(),
  hazards: z.array(z.string()),
  location_text: z.string().nullable(),
  location_confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()),
  missing_information: z.array(z.string()),
  possible_duplicate_ids: z.array(z.string()),
  recommended_action: z.string().min(1),
  recommended_service_types: z.array(z.string()),
  needs_human_review: z.boolean(),
});

export type IncidentAssessmentRaw = z.infer<typeof IncidentAssessmentSchema>;

/**
 * Parse and validate snake_case AI JSON, then map to camelCase IncidentAssessment.
 * Never coerces or guess-fills invalid fields — throws on any validation failure.
 */
export function parseAssessment(json: unknown): IncidentAssessment {
  const raw = IncidentAssessmentSchema.parse(json);

  return {
    incidentType: raw.incident_type,
    triage: raw.triage,
    confidence: raw.confidence,
    summary: raw.summary,
    peopleAffected: raw.people_affected,
    hazards: raw.hazards,
    locationText: raw.location_text,
    locationConfidence: raw.location_confidence,
    evidence: raw.evidence,
    missingInformation: raw.missing_information,
    possibleDuplicateIds: raw.possible_duplicate_ids,
    recommendedAction: raw.recommended_action,
    recommendedServiceTypes: raw.recommended_service_types,
    needsHumanReview: raw.needs_human_review,
  };
}
