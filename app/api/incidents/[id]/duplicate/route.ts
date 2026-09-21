import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, withErrorHandler } from "@/lib/api/errors";
import { requireStaffOrError, isStaffUser } from "@/lib/auth/roles";
import { DuplicateActionSchema } from "@/lib/validation/schemas";
import { isValidTransition } from "@/lib/incidents/transitions";
import { guardedStatusUpdate } from "@/lib/incidents/guarded-update";

export const runtime = "nodejs";

export const POST = withErrorHandler(
  async (request: Request, context: unknown) => {
    const ctx = context as { params: Promise<{ id: string }> };
    const { id: incidentId } = await ctx.params;

    const staffOrError = await requireStaffOrError(
      request,
      "responder",
      "coordinator",
      "admin"
    );
    if (!isStaffUser(staffOrError)) return staffOrError;
    const staff = staffOrError;

    // Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("VALIDATION_ERROR", "Invalid JSON body.", false);
    }

    const parsed = DuplicateActionSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return errorResponse(
        "VALIDATION_ERROR",
        `${firstIssue.path.join(".")}: ${firstIssue.message}`,
        false
      );
    }

    const { possible_duplicate_of, action } = parsed.data;
    const resolution = action === "merge" ? "merged" : "kept_separate";
    const supabase = getSupabaseServiceClient();

    // ── Load both incidents ──
    const { data: incident } = await supabase
      .from("incidents")
      .select("id, status")
      .eq("id", incidentId)
      .maybeSingle();

    if (!incident) {
      return errorResponse("NOT_FOUND", "Incident not found.", false);
    }

    const { data: survivingIncident } = await supabase
      .from("incidents")
      .select("id, status")
      .eq("id", possible_duplicate_of)
      .maybeSingle();

    if (!survivingIncident) {
      return errorResponse(
        "NOT_FOUND",
        "The possible_duplicate_of incident was not found.",
        false
      );
    }

    // ── Insert incident_duplicates row ──
    const { error: dupError } = await supabase
      .from("incident_duplicates")
      .insert({
        incident_id: incidentId,
        possible_duplicate_of,
        resolution,
        resolved_by: staff.id,
      });

    if (dupError) {
      console.error("[duplicate] Insert error:", dupError.message);
      return errorResponse(
        "INTERNAL_ERROR",
        "Failed to record duplicate resolution.",
        true
      );
    }

    if (action === "merge") {
      // ── Merge: set the current incident to 'rejected' with false_or_duplicate ──
      const { error: updateError } = await supabase
        .from("incidents")
        .update({
          status: "rejected",
          verification_status: "false_or_duplicate",
        })
        .eq("id", incidentId);

      if (updateError) {
        console.error("[duplicate] Merge update error:", updateError.message);
      }

      // Log event on the merged (rejected) incident
      await supabase.from("incident_events").insert({
        incident_id: incidentId,
        event_type: "duplicate_merged",
        actor_id: staff.id,
        actor_role: staff.role,
        payload: {
          action: "merge",
          resolution: "merged",
          surviving_incident_id: possible_duplicate_of,
          from: incident.status,
          to: "rejected",
        },
      });

      // Log event on the surviving incident
      await supabase.from("incident_events").insert({
        incident_id: possible_duplicate_of,
        event_type: "duplicate_merged",
        actor_id: staff.id,
        actor_role: staff.role,
        payload: {
          action: "merge",
          resolution: "merged",
          merged_incident_id: incidentId,
        },
      });
    } else {
      // ── Keep separate: move from duplicate_review to reviewed ──
      if (
        incident.status === "duplicate_review" &&
        isValidTransition("duplicate_review", "reviewed")
      ) {
        const result = await guardedStatusUpdate({
          incidentId,
          currentStatus: "duplicate_review",
          targetStatus: "reviewed",
          staff,
          eventType: "duplicate_kept_separate",
          eventPayload: {
            action: "keep_separate",
            resolution: "kept_separate",
            compared_to: possible_duplicate_of,
          },
        });

        if (!result.success && result.status === 409) {
          // Status already changed — log the event anyway
          await supabase.from("incident_events").insert({
            incident_id: incidentId,
            event_type: "duplicate_kept_separate",
            actor_id: staff.id,
            actor_role: staff.role,
            payload: {
              action: "keep_separate",
              resolution: "kept_separate",
              compared_to: possible_duplicate_of,
              status_transition_failed: true,
            },
          });
        }
      } else {
        // Not in duplicate_review — just log the event
        await supabase.from("incident_events").insert({
          incident_id: incidentId,
          event_type: "duplicate_kept_separate",
          actor_id: staff.id,
          actor_role: staff.role,
          payload: {
            action: "keep_separate",
            resolution: "kept_separate",
            compared_to: possible_duplicate_of,
            status_unchanged: true,
            current_status: incident.status,
          },
        });
      }
    }

    return NextResponse.json(
      {
        incident_id: incidentId,
        possible_duplicate_of,
        resolution,
      },
      { status: 200 }
    );
  }
);
