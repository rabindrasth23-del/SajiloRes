import "server-only";

/**
 * AI Provider interfaces — TRD §4.2 (camelCase)
 */

export interface NearbyIncidentSummary {
  id: string;
  incidentType: string | null;
  rawTextSnippet: string; // truncated to ~200 chars
  latitude: number | null;
  longitude: number | null;
  createdAt: string; // ISO timestamp
}

export interface ResponderSummary {
  id: string;
  serviceType: string;
  distanceKm: number | null;
}

export interface IncidentAIInput {
  rawText: string;
  selectedType?: string;
  latitude?: number;
  longitude?: number;
  locationText?: string;
  photoUrl?: string;
  createdAt: string; // ISO timestamp
  nearbyIncidents: NearbyIncidentSummary[];
  nearbyResponders: ResponderSummary[];
}

export interface IncidentAssessment {
  incidentType: string;
  triage: "immediate" | "delayed" | "minor" | "unknown";
  confidence: number; // 0..1
  summary: string;
  peopleAffected: number | null;
  hazards: string[];
  locationText: string | null;
  locationConfidence: number; // 0..1
  evidence: string[];
  missingInformation: string[];
  possibleDuplicateIds: string[];
  recommendedAction: string;
  recommendedServiceTypes: string[]; // e.g. ["ambulance","rescue","police"]
  needsHumanReview: boolean;
}

export interface AIProvider {
  analyzeIncident(
    input: IncidentAIInput,
    signal?: AbortSignal
  ): Promise<IncidentAssessment>;
}
