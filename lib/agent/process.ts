import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { getProvider } from "@/lib/ai";
import { parseAssessment } from "@/lib/ai/schema";
import { haversine } from "@/lib/geo/haversine";
import { runDuplicateHeuristic } from "./duplicate";
import { isValidTransition } from "@/lib/incidents/transitions";
import type { IncidentAIInput, IncidentAssessment, NearbyIncidentSummary, ResponderSummary } from "@/lib/ai/provider";
import type { Json } from "@/lib/supabase/database.types";

// ── Config ──
const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || "10000", 10);
const AI_CONFIDENCE_THRESHOLD = parseFloat(process.env.AI_CONFIDENCE_THRESHOLD || "0.65");
const DUPLICATE_RADIUS_M = parseInt(process.env.DUPLICATE_RADIUS_M || "500", 10);
const DUPLICATE_WINDOW_MIN = parseInt(process.env.DUPLICATE_WINDOW_MIN || "360", 10);
const LOCATION_CONFIDENCE_THRESHOLD = parseFloat(process.env.LOCATION_CONFIDENCE_THRESHOLD || "0.5");
const RESPONDER_SEARCH_RADIUS_KM = parseInt(process.env.RESPONDER_SEARCH_RADIUS_KM || "50", 10);

/** Read per-call so tests can override at dev-server start */
function getClaimStaleSec(): number {
  return parseInt(process.env.AI_CLAIM_STALE_SECONDS || "90", 10);
}

// Allowed incident types
const ALLOWED_INCIDENT_TYPES = new Set([
  "building_collapse", "flood_landslide", "fire", "medical", "road_blockage", "other",
]);

// Allowed service types (from responders.service_type CHECK)
const ALLOWED_SERVICE_TYPES = new Set([
  "ambulance", "rescue", "police", "fire", "hospital", "coordinator", "ngo", "volunteer",
]);

export interface ProcessResult {
  aiStatus: string;
  status: string;
  skipped?: boolean;
  error?: string;
}

/**
 * processIncident — Observe → Reason → Plan → Act → Verify
 *
 * NEVER throws. All errors are caught and result in appropriate
 * ai_status updates and event logging.
 */
export async function processIncident(
  incidentId: string,
  opts?: { force?: boolean }
): Promise<ProcessResult> {
  const supabase = getSupabaseServiceClient();
  const force = opts?.force ?? false;

  try {
    // ══════════════════════════════════════════
    // STEP 1: CLAIM
    // ══════════════════════════════════════════
    const { data: incident } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .maybeSingle();

    if (!incident) {
      return { aiStatus: "unknown", status: "unknown", error: "Incident not found" };
    }

    // If completed and not force, return existing result
    if (incident.ai_status === "completed" && !force) {
      return { aiStatus: "completed", status: incident.status, skipped: true };
    }

    // If processing, check if stale
    if (incident.ai_status === "processing") {
      const updatedAt = new Date(incident.updated_at as string).getTime();
      const now = Date.now();
      const staleSec = (now - updatedAt) / 1000;
      if (staleSec < getClaimStaleSec()) {
        // Fresh claim — another process is working on it
        return { aiStatus: "processing", status: incident.status, skipped: true };
      }
      // Stale — reclaim it below
    }

    // Guarded claim: ai_status pending|failed → processing, OR stale processing → processing
    const claimStatuses = ["pending", "failed"];
    if (incident.ai_status === "processing") {
      claimStatuses.push("processing"); // stale reclaim
    }
    if (force && incident.ai_status === "completed") {
      claimStatuses.push("completed"); // force re-run
    }

    const { data: claimed } = await supabase
      .from("incidents")
      .update({ ai_status: "processing" })
      .eq("id", incidentId)
      .in("ai_status", claimStatuses)
      .select("id, ai_status")
      .maybeSingle();

    if (!claimed) {
      // Another process claimed it
      return { aiStatus: incident.ai_status, status: incident.status, skipped: true };
    }

    // Re-load full incident after claiming
    const { data: inc } = await supabase
      .from("incidents")
      .select("*")
      .eq("id", incidentId)
      .single();

    if (!inc) {
      return { aiStatus: "unknown", status: "unknown", error: "Incident disappeared" };
    }

    // ══════════════════════════════════════════
    // STEP 2: OBSERVE
    // ══════════════════════════════════════════

    // Load candidate nearby incidents
    const windowMs = DUPLICATE_WINDOW_MIN * 60 * 1000;
    const incTime = new Date(inc.created_at as string).getTime();
    const windowStart = new Date(incTime - windowMs).toISOString();
    const windowEnd = new Date(incTime + windowMs).toISOString();

    const { data: candidateRows } = await supabase
      .from("incidents")
      .select("id, incident_type, raw_text, latitude, longitude, created_at")
      .neq("id", incidentId)
      .gte("created_at", windowStart)
      .lte("created_at", windowEnd)
      .limit(10);

    const candidates = (candidateRows || []).map((c) => ({
      id: c.id as string,
      incidentType: c.incident_type as string | null,
      rawText: c.raw_text as string,
      latitude: c.latitude as number | null,
      longitude: c.longitude as number | null,
      createdAt: c.created_at as string,
    }));

    // Load verified + available responders
    const responderQuery = supabase
      .from("responders")
      .select("id, service_type, latitude, longitude")
      .eq("verified", true)
      .eq("available", true)
      .limit(10);

    const { data: responderRows } = await responderQuery;

    const nearbyResponders: ResponderSummary[] = (responderRows || []).map((r) => {
      let distKm: number | null = null;
      if (inc.latitude != null && inc.longitude != null && r.latitude != null && r.longitude != null) {
        distKm = Math.round(haversine(inc.latitude, inc.longitude, r.latitude, r.longitude) / 10) / 100;
      }
      return {
        id: r.id as string,
        serviceType: r.service_type as string,
        distanceKm: distKm,
      };
    });

    // Sort by distance
    nearbyResponders.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

    // Load prior human_correction events
    const { data: correctionEvents } = await supabase
      .from("incident_events")
      .select("payload")
      .eq("incident_id", incidentId)
      .eq("event_type", "human_correction");

    const correctedFields = new Set<string>();
    for (const evt of correctionEvents || []) {
      const payload = evt.payload as Record<string, unknown> | null;
      if (payload?.field) correctedFields.add(payload.field as string);
      if (payload?.changes && typeof payload.changes === "object") {
        for (const key of Object.keys(payload.changes as object)) {
          correctedFields.add(key);
        }
      }
      // Also handle old_values/new_values shape from /modify route
      if (payload?.new_values && typeof payload.new_values === "object") {
        for (const key of Object.keys(payload.new_values as object)) {
          correctedFields.add(key);
        }
      }
    }

    // Nearby incidents for AI input
    const nearbyIncidents: NearbyIncidentSummary[] = candidates.map((c) => ({
      id: c.id,
      incidentType: c.incidentType,
      rawTextSnippet: c.rawText.substring(0, 200),
      latitude: c.latitude,
      longitude: c.longitude,
      createdAt: c.createdAt,
    }));

    // ══════════════════════════════════════════
    // STEP 3: REASON — call provider
    // ══════════════════════════════════════════

    const aiInput: IncidentAIInput = {
      rawText: inc.raw_text,
      selectedType: inc.incident_type || undefined,
      latitude: inc.latitude ?? undefined,
      longitude: inc.longitude ?? undefined,
      locationText: inc.location_text ?? undefined,
      createdAt: inc.created_at as string,
      nearbyIncidents,
      nearbyResponders,
    };

    let assessment: IncidentAssessment;
    let attempts = 0;

    try {
      const provider = getProvider();

      // Try up to 2 times (1 automatic retry)
      for (let attempt = 0; attempt < 2; attempt++) {
        attempts++;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

          try {
            const result = await provider.analyzeIncident(aiInput, controller.signal);
            clearTimeout(timeout);
            assessment = result;
            break;
          } catch (err) {
            clearTimeout(timeout);
            if (attempt === 1) throw err; // Last attempt, propagate
            console.warn(`[processIncident] Attempt ${attempt + 1} failed, retrying:`, err);
            continue;
          }
        } catch (err) {
          if (attempt === 1) throw err;
          continue;
        }
      }

      // @ts-expect-error — assessment is assigned in the loop or throws
      if (!assessment) {
        throw new Error("Provider returned no result after retries");
      }
    } catch (providerError) {
      // Provider error (timeout, network, config) → ai_status back to pending
      console.error("[processIncident] Provider error:", providerError);

      await supabase
        .from("incidents")
        .update({ ai_status: "pending" })
        .eq("id", incidentId)
        .eq("ai_status", "processing");

      await supabase.from("incident_events").insert({
        incident_id: incidentId,
        event_type: "ai_processing_failed",
        actor_role: "system",
        payload: {
          error: providerError instanceof Error ? providerError.message : String(providerError),
          error_type: "provider_error",
          attempts,
          retryable: true,
        },
      });

      const { data: final } = await supabase
        .from("incidents")
        .select("ai_status, status")
        .eq("id", incidentId)
        .single();

      return {
        aiStatus: final?.ai_status || "pending",
        status: final?.status || inc.status,
      };
    }

    // ── Validate AI output through schema ──
    let validated: IncidentAssessment;
    try {
      // The mock provider returns camelCase directly, but real providers return snake_case JSON
      // For the mock, assessment is already camelCase. For real providers, we'd parse raw JSON.
      // Validate via parseAssessment by converting to snake_case first
      const snakeCaseObj = {
        incident_type: assessment.incidentType,
        triage: assessment.triage,
        confidence: assessment.confidence,
        summary: assessment.summary,
        people_affected: assessment.peopleAffected,
        hazards: assessment.hazards,
        location_text: assessment.locationText,
        location_confidence: assessment.locationConfidence,
        evidence: assessment.evidence,
        missing_information: assessment.missingInformation,
        possible_duplicate_ids: assessment.possibleDuplicateIds,
        recommended_action: assessment.recommendedAction,
        recommended_service_types: assessment.recommendedServiceTypes,
        needs_human_review: assessment.needsHumanReview,
      };
      validated = parseAssessment(snakeCaseObj);
    } catch (schemaError) {
      // Schema validation failure → ai_status failed
      console.error("[processIncident] Schema validation failed:", schemaError);

      await supabase
        .from("incidents")
        .update({ ai_status: "failed" })
        .eq("id", incidentId)
        .eq("ai_status", "processing");

      await supabase.from("incident_events").insert({
        incident_id: incidentId,
        event_type: "ai_processing_failed",
        actor_role: "system",
        payload: {
          error: schemaError instanceof Error ? schemaError.message : String(schemaError),
          error_type: "schema_validation_error",
          attempts,
          retryable: false,
        },
      });

      const { data: final } = await supabase
        .from("incidents")
        .select("ai_status, status")
        .eq("id", incidentId)
        .single();

      return {
        aiStatus: final?.ai_status || "failed",
        status: final?.status || inc.status,
      };
    }

    // ══════════════════════════════════════════
    // STEP 4: PLAN + VERIFY (server overrides)
    // ══════════════════════════════════════════

    // ── incident_type: normalize ──
    let finalType = validated.incidentType;
    let originalType: string | null = null;
    if (!ALLOWED_INCIDENT_TYPES.has(finalType)) {
      originalType = finalType;
      finalType = "other";
    }
    // Human correction: don't override if corrected
    if (correctedFields.has("incident_type")) {
      finalType = inc.incident_type || finalType;
    }

    // ── triage: human correction check ──
    let finalTriage = validated.triage;
    if (correctedFields.has("triage")) {
      finalTriage = (inc.triage as IncidentAssessment["triage"]) || finalTriage;
    }

    // ── recommended_service_types: filter invalid ──
    const droppedServices: string[] = [];
    const validServices = validated.recommendedServiceTypes.filter((s) => {
      if (ALLOWED_SERVICE_TYPES.has(s)) return true;
      droppedServices.push(s);
      return false;
    });

    // ── recommended_action: human correction check ──
    let finalAction = validated.recommendedAction;
    if (correctedFields.has("recommended_action")) {
      finalAction = inc.recommended_action || finalAction;
    }

    // ── needs_human_review: server overrides ──
    let needsReview = validated.needsHumanReview;
    const reviewReasons: string[] = [];

    if (finalTriage === "immediate" || finalTriage === "unknown") {
      needsReview = true;
      reviewReasons.push(`triage_is_${finalTriage}`);
    }
    if (validated.confidence < AI_CONFIDENCE_THRESHOLD) {
      needsReview = true;
      reviewReasons.push("low_confidence");
    }

    // Location uncertainty check
    const hasCoords = inc.latitude != null && inc.longitude != null;
    const hasLocText = !!inc.location_text;
    if (!hasCoords && !hasLocText) {
      needsReview = true;
      reviewReasons.push("no_location");
    } else if (validated.locationConfidence < LOCATION_CONFIDENCE_THRESHOLD) {
      needsReview = true;
      reviewReasons.push("low_location_confidence");
    }

    // ── Duplicates: server heuristic ──
    const duplicateMatches = runDuplicateHeuristic(
      {
        id: incidentId,
        incidentType: finalType,
        rawText: inc.raw_text,
        latitude: inc.latitude,
        longitude: inc.longitude,
        createdAt: inc.created_at as string,
      },
      candidates,
      DUPLICATE_RADIUS_M,
      DUPLICATE_WINDOW_MIN
    );

    // Filter model's duplicate IDs: only keep those in the candidate set
    const candidateIds = new Set(candidates.map((c) => c.id));
    const modelDups = validated.possibleDuplicateIds.filter((id) => candidateIds.has(id));
    const droppedDups = validated.possibleDuplicateIds.filter((id) => !candidateIds.has(id));

    // Merge model + heuristic duplicates (union)
    const allDupIds = new Set([
      ...duplicateMatches.map((m) => m.id),
      ...modelDups,
    ]);

    if (allDupIds.size > 0) {
      needsReview = true;
      reviewReasons.push("duplicate_suspected");
    }

    // ── Location: never set lat/lng from AI; location_text only when citizen gave none ──
    let aiLocationText = validated.locationText;
    if (inc.location_text) {
      aiLocationText = inc.location_text; // keep citizen's
    }

    // ══════════════════════════════════════════
    // STEP 5: ACT — persist and log events
    // ══════════════════════════════════════════

    // ── Event 1: facts_extracted ──
    await supabase.from("incident_events").insert({
      incident_id: incidentId,
      event_type: "facts_extracted",
      actor_role: "ai",
      payload: {
        assessment: {
          incident_type: finalType,
          original_type: originalType,
          triage: validated.triage,
          confidence: validated.confidence,
          summary: validated.summary,
          people_affected: validated.peopleAffected,
          hazards: validated.hazards,
          evidence: validated.evidence,
          missing_information: validated.missingInformation,
          location_text: validated.locationText,
          location_confidence: validated.locationConfidence,
        },
        attempts,
        dropped_services: droppedServices.length > 0 ? droppedServices : undefined,
        dropped_duplicates: droppedDups.length > 0 ? droppedDups : undefined,
        human_corrections_applied: correctedFields.size > 0 ? [...correctedFields] : undefined,
      },
    });

    // ── Event 2: duplicate_check_completed ──
    // Insert incident_duplicates rows (no duplicates on re-run)
    const dupRowsToInsert: Array<{
      incident_id: string;
      possible_duplicate_of: string;
      similarity_score: number;
      resolution: string;
    }> = [];

    for (const dupId of allDupIds) {
      // Check if already exists
      const { data: existing } = await supabase
        .from("incident_duplicates")
        .select("id")
        .eq("incident_id", incidentId)
        .eq("possible_duplicate_of", dupId)
        .maybeSingle();

      if (!existing) {
        const match = duplicateMatches.find((m) => m.id === dupId);
        dupRowsToInsert.push({
          incident_id: incidentId,
          possible_duplicate_of: dupId,
          similarity_score: match?.similarityScore ?? 0.5,
          resolution: "unresolved",
        });
      }
    }

    if (dupRowsToInsert.length > 0) {
      await supabase.from("incident_duplicates").insert(dupRowsToInsert);
    }

    await supabase.from("incident_events").insert({
      incident_id: incidentId,
      event_type: "duplicate_check_completed",
      actor_role: "ai",
      payload: {
        candidates_checked: candidates.length,
        duplicates_found: [...allDupIds],
        heuristic_matches: duplicateMatches.map((m) => ({ id: m.id, score: m.similarityScore, reason: m.reason })),
        model_suggested: validated.possibleDuplicateIds,
        model_dropped: droppedDups,
        attempts,
      },
    });

    // ── Event 3: triage_recommended ──
    await supabase.from("incident_events").insert({
      incident_id: incidentId,
      event_type: "triage_recommended",
      actor_role: "ai",
      payload: {
        triage: finalTriage,
        ai_suggested_triage: validated.triage,
        confidence: validated.confidence,
        needs_human_review: needsReview,
        review_reasons: reviewReasons,
        human_override: correctedFields.has("triage"),
        attempts,
      },
    });

    // ── Persist assessment to incident (guarded on ai_status='processing') ──
    // Determine target status (only if still 'new')
    let targetStatus: string | null = null;
    if (inc.status === "new") {
      if (allDupIds.size > 0 && isValidTransition("new", "duplicate_review")) {
        targetStatus = "duplicate_review";
      } else if (!hasCoords && !hasLocText && isValidTransition("new", "location_missing")) {
        targetStatus = "location_missing";
      } else if (isValidTransition("new", "reviewed")) {
        targetStatus = "reviewed";
      }
    }

    const updateData: {
      ai_status: string;
      incident_type: string;
      triage: string;
      confidence: number;
      summary: string;
      people_affected: number | null;
      hazards: Json;
      evidence: Json;
      missing_information: Json;
      recommended_action: string;
      recommended_service_types: Json;
      needs_human_review: boolean;
      location_confidence: number;
      location_text?: string;
      verification_status?: string;
      status?: string;
    } = {
      ai_status: "completed",
      incident_type: finalType,
      triage: finalTriage,
      confidence: validated.confidence,
      summary: validated.summary,
      people_affected: validated.peopleAffected,
      hazards: validated.hazards as Json,
      evidence: validated.evidence as Json,
      missing_information: validated.missingInformation as Json,
      recommended_action: finalAction,
      recommended_service_types: validServices as Json,
      needs_human_review: needsReview,
      location_confidence: validated.locationConfidence,
    };

    // Only fill location_text from AI when citizen gave none
    if (!inc.location_text && aiLocationText) {
      updateData.location_text = aiLocationText;
    }
    // Set verification_status unless already human_verified
    if (inc.verification_status !== "human_verified") {
      updateData.verification_status = "ai_reviewed";
    }
    if (targetStatus) {
      updateData.status = targetStatus;
    }

    const { data: updated } = await supabase
      .from("incidents")
      .update(updateData)
      .eq("id", incidentId)
      .eq("ai_status", "processing")
      .select("id, status, ai_status")
      .maybeSingle();

    if (!updated) {
      // Lost the claim — another process took over
      return { aiStatus: "processing", status: inc.status, error: "Lost claim during persist" };
    }

    // Filter to nearby responders matching the service types
    let matchedResponders = nearbyResponders.filter((r) => {
      if (!validServices.includes(r.serviceType)) return false;
      // If we can calculate distance, apply proximity filter
      if (r.distanceKm != null && r.distanceKm > RESPONDER_SEARCH_RADIUS_KM) return false;
      return true;
    });

    let coordinatorFallback = false;
    if (matchedResponders.length === 0) {
      // Fallback to coordinator-type responders (regardless of distance)
      matchedResponders = nearbyResponders.filter(
        (r) => r.serviceType === "coordinator"
      );
      coordinatorFallback = true;
    }

    await supabase.from("incident_events").insert({
      incident_id: incidentId,
      event_type: "responders_found",
      actor_role: "system",
      payload: {
        responders: matchedResponders.map((r) => ({
          id: r.id,
          service_type: r.serviceType,
          distance_km: r.distanceKm,
        })),
        requested_service_types: validServices,
        coordinator_fallback: coordinatorFallback,
        coordinator_queue: coordinatorFallback ? true : undefined,
        attempts,
      },
    });

    // ── Event 5: approval_requested ──
    await supabase.from("incident_events").insert({
      incident_id: incidentId,
      event_type: "approval_requested",
      actor_role: "system",
      payload: {
        status: updated.status,
        needs_human_review: needsReview,
        review_reasons: reviewReasons,
        triage: finalTriage,
        confidence: validated.confidence,
        attempts,
      },
    });

    return {
      aiStatus: updated.ai_status,
      status: updated.status,
    };
  } catch (unexpectedError) {
    // ── try/finally: unexpected exception → ai_status back to pending ──
    console.error("[processIncident] Unexpected error:", unexpectedError);

    try {
      const supabase2 = getSupabaseServiceClient();

      await supabase2
        .from("incidents")
        .update({ ai_status: "pending" })
        .eq("id", incidentId)
        .eq("ai_status", "processing");

      await supabase2.from("incident_events").insert({
        incident_id: incidentId,
        event_type: "ai_processing_failed",
        actor_role: "system",
        payload: {
          error: unexpectedError instanceof Error ? unexpectedError.message : String(unexpectedError),
          error_type: "unexpected_error",
          attempts: 0,
          retryable: true,
        },
      });
    } catch (cleanupErr) {
      console.error("[processIncident] Cleanup also failed:", cleanupErr);
    }

    const supabase3 = getSupabaseServiceClient();
    const { data: final } = await supabase3
      .from("incidents")
      .select("ai_status, status")
      .eq("id", incidentId)
      .maybeSingle();

    return {
      aiStatus: final?.ai_status || "pending",
      status: final?.status || "new",
    };
  }
}
