import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, withErrorHandler } from "@/lib/api/errors";
import { requireStaffOrError, isStaffUser } from "@/lib/auth/roles";
import { ModifyIncidentSchema } from "@/lib/validation/schemas";
import type { TablesUpdate } from "@/lib/supabase/database.types";

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

    const parsed = ModifyIncidentSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return errorResponse(
        "VALIDATION_ERROR",
        `${firstIssue.path.join(".")}: ${firstIssue.message}`,
        false
      );
    }

    const { triage, incident_type, recommended_action, reason } = parsed.data;
    const supabase = getSupabaseServiceClient();

    // ── Load current incident ──
    const { data: incident } = await supabase
      .from("incidents")
      .select("id, triage, incident_type, recommended_action, verification_status")
      .eq("id", incidentId)
      .maybeSingle();

    if (!incident) {
      return errorResponse("NOT_FOUND", "Incident not found.", false);
    }

    // ── Build update payload ──
    const oldValues: Record<string, string | null> = {};
    const newValues: Record<string, string | null> = {};
    const updateData: TablesUpdate<"incidents"> = {
      verification_status: "human_verified",
    };

    if (triage !== undefined) {
      oldValues.triage = incident.triage;
      newValues.triage = triage;
      updateData.triage = triage;
    }

    if (incident_type !== undefined) {
      oldValues.incident_type = incident.incident_type;
      newValues.incident_type = incident_type;
      updateData.incident_type = incident_type;
    }

    if (recommended_action !== undefined) {
      oldValues.recommended_action = incident.recommended_action;
      newValues.recommended_action = recommended_action;
      updateData.recommended_action = recommended_action;
    }

    // ── Update incident ──
    const { data: updated, error: updateError } = await supabase
      .from("incidents")
      .update(updateData)
      .eq("id", incidentId)
      .select("id, triage, incident_type, recommended_action, verification_status")
      .single();

    if (updateError) {
      console.error("[modify] Update error:", updateError.message);
      return errorResponse("INTERNAL_ERROR", "Failed to modify incident.", true);
    }

    // ── Log human_correction event ──
    const { error: eventError } = await supabase
      .from("incident_events")
      .insert({
        incident_id: incidentId,
        event_type: "human_correction",
        actor_id: staff.id,
        actor_role: staff.role,
        payload: {
          old_values: oldValues,
          new_values: newValues,
          reason,
          verification_status: "human_verified",
        } as unknown as Record<string, string>,
      });

    if (eventError) {
      console.error("[modify] Event insert error:", eventError.message);
    }

    return NextResponse.json(updated, { status: 200 });
  }
);
