import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, withErrorHandler } from "@/lib/api/errors";
import { requireStaffOrError, isStaffUser } from "@/lib/auth/roles";
import { ChangeStatusSchema } from "@/lib/validation/schemas";
import {
  isValidTransition,
  STATUS_ROUTE_ALLOWED_TARGETS,
  getAssignmentStatusForIncident,
} from "@/lib/incidents/transitions";
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

    const parsed = ChangeStatusSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return errorResponse(
        "VALIDATION_ERROR",
        `${firstIssue.path.join(".")}: ${firstIssue.message}`,
        false
      );
    }

    const { status: targetStatus, reason } = parsed.data;

    // ── Check target is allowed via this route ──
    if (!STATUS_ROUTE_ALLOWED_TARGETS.has(targetStatus)) {
      return errorResponse(
        "VALIDATION_ERROR",
        `Status '${targetStatus}' cannot be set via this route. Use the appropriate action route (assign, approve, etc.).`,
        false
      );
    }

    const supabase = getSupabaseServiceClient();

    // ── Load current incident ──
    const { data: incident } = await supabase
      .from("incidents")
      .select("id, status")
      .eq("id", incidentId)
      .maybeSingle();

    if (!incident) {
      return errorResponse("NOT_FOUND", "Incident not found.", false);
    }

    // ── Check transition is valid ──
    if (!isValidTransition(incident.status, targetStatus)) {
      // Re-load to detect race: if status changed since our read, it's a conflict
      const { data: freshIncident } = await supabase
        .from("incidents")
        .select("id, status")
        .eq("id", incidentId)
        .maybeSingle();

      if (freshIncident && freshIncident.status !== incident.status) {
        return errorResponse(
          "CONFLICT",
          `Incident status has changed since you last read it (now '${freshIncident.status}'). Refresh and retry.`,
          true
        );
      }

      return errorResponse(
        "VALIDATION_ERROR",
        `Cannot transition from '${incident.status}' to '${targetStatus}'.`,
        false
      );
    }

    // ── Guarded update ──
    const result = await guardedStatusUpdate({
      incidentId,
      currentStatus: incident.status,
      targetStatus,
      staff,
      eventType: "status_changed",
      eventPayload: { reason },
    });

    if (!result.success) {
      if (result.status === 409) {
        return errorResponse(
          "CONFLICT",
          result.error,
          true
        );
      }
      return errorResponse("INTERNAL_ERROR", result.error, true);
    }

    // ── Cascade to active assignments ──
    const assignmentStatus = getAssignmentStatusForIncident(targetStatus);
    if (assignmentStatus) {
      // Move all active assignments to the corresponding status
      const activeStatuses = ["assigned", "acknowledged", "dispatched"];
      const { error: assignUpdateError } = await supabase
        .from("assignments")
        .update({ status: assignmentStatus })
        .eq("incident_id", incidentId)
        .in("status", activeStatuses);

      if (assignUpdateError) {
        console.error(
          "[status] Assignment cascade error:",
          assignUpdateError.message
        );
        // Non-fatal: incident status is already updated
      }
    }

    return NextResponse.json(
      {
        incident_id: incidentId,
        status: targetStatus,
        previous_status: incident.status,
      },
      { status: 200 }
    );
  }
);
