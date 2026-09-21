import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, withErrorHandler } from "@/lib/api/errors";
import { requireStaffOrError, isStaffUser } from "@/lib/auth/roles";
import { AssignResponderSchema } from "@/lib/validation/schemas";
import { isValidTransition } from "@/lib/incidents/transitions";
import { guardedStatusUpdate } from "@/lib/incidents/guarded-update";

export const runtime = "nodejs";

// Statuses from which assignment is allowed
const ASSIGNABLE_STATUSES = new Set([
  "approved",
  "notification_failed",
  "escalation_required",
  "acknowledged",
  "assigned",
  "dispatched",
]);

// Statuses that should transition to 'assigned' when a responder is assigned
const TRANSITION_TO_ASSIGNED = new Set([
  "approved",
  "notification_failed",
  "escalation_required",
]);

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

    const parsed = AssignResponderSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return errorResponse(
        "VALIDATION_ERROR",
        `${firstIssue.path.join(".")}: ${firstIssue.message}`,
        false
      );
    }

    const { responder_id, notes } = parsed.data;
    const supabase = getSupabaseServiceClient();

    // ── Load incident ──
    const { data: incident } = await supabase
      .from("incidents")
      .select("id, status")
      .eq("id", incidentId)
      .maybeSingle();

    if (!incident) {
      return errorResponse("NOT_FOUND", "Incident not found.", false);
    }

    // ── Check incident is in an assignable state ──
    if (!ASSIGNABLE_STATUSES.has(incident.status)) {
      return errorResponse(
        "CONFLICT",
        `Cannot assign a responder when incident is in '${incident.status}' status. ` +
          `Allowed statuses: ${[...ASSIGNABLE_STATUSES].join(", ")}.`,
        false
      );
    }

    // ── Validate responder ──
    const { data: responder } = await supabase
      .from("responders")
      .select("id, organization, verified, available")
      .eq("id", responder_id)
      .maybeSingle();

    if (!responder) {
      return errorResponse("NOT_FOUND", "Responder not found.", false);
    }

    if (!responder.verified) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Responder is not verified.",
        false
      );
    }

    if (!responder.available) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Responder is not currently available.",
        false
      );
    }

    // ── Check for active duplicate assignment ──
    const { data: existingAssignment } = await supabase
      .from("assignments")
      .select("id, status")
      .eq("incident_id", incidentId)
      .eq("responder_id", responder_id)
      .in("status", ["assigned", "acknowledged", "dispatched"])
      .maybeSingle();

    if (existingAssignment) {
      return errorResponse(
        "CONFLICT",
        "This responder is already actively assigned to this incident.",
        false
      );
    }

    // ── Insert assignment row ──
    const { data: assignment, error: assignError } = await supabase
      .from("assignments")
      .insert({
        incident_id: incidentId,
        responder_id,
        status: "assigned",
        assigned_by: staff.id,
      })
      .select("id")
      .single();

    if (assignError) {
      console.error("[assign] Insert error:", assignError.message);
      return errorResponse("INTERNAL_ERROR", "Failed to create assignment.", true);
    }

    // ── Transition incident status if needed ──
    if (TRANSITION_TO_ASSIGNED.has(incident.status)) {
      // approved / notification_failed / escalation_required → assigned
      if (isValidTransition(incident.status, "assigned")) {
        const result = await guardedStatusUpdate({
          incidentId,
          currentStatus: incident.status,
          targetStatus: "assigned",
          staff,
          eventType: "responder_assigned",
          eventPayload: {
            responder_id,
            assignment_id: assignment.id,
            responder_org: responder.organization,
            notes: notes ?? null,
          },
        });

        if (!result.success) {
          // Guarded update failed — delete the assignment row we just inserted
          await supabase
            .from("assignments")
            .delete()
            .eq("id", assignment.id);

          return errorResponse("CONFLICT", result.error, true);
        }
      }
    } else {
      // acknowledged / assigned / dispatched — leave status unchanged, just log event
      await supabase.from("incident_events").insert({
        incident_id: incidentId,
        event_type: "responder_assigned",
        actor_id: staff.id,
        actor_role: staff.role,
        payload: {
          responder_id,
          assignment_id: assignment.id,
          responder_org: responder.organization,
          notes: notes ?? null,
          status_unchanged: true,
          current_status: incident.status,
        },
      });
    }

    return NextResponse.json(
      {
        assignment_id: assignment.id,
        incident_id: incidentId,
        responder_id,
        status: "assigned",
      },
      { status: 200 }
    );
  }
);
