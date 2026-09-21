import "server-only";

import { getSupabaseServiceClient } from "@/lib/supabase/server";
import type { StaffUser } from "@/lib/auth/roles";
import type { TablesUpdate } from "@/lib/supabase/database.types";

/**
 * Guarded incident status update with event logging.
 *
 * Concurrency: Uses `where id = ? AND status = ?` to prevent ABA races.
 * If 0 rows are updated, the status was changed by another request → 409.
 *
 * Event consistency: If the event insert fails after a successful status
 * update, we attempt to revert the status update (guarded). This is a
 * known MVP limitation — there are no DB transactions in supabase-js.
 * In production, use a Postgres function with BEGIN/COMMIT instead.
 *
 * @returns { success: true, incident } or { success: false, error, status }
 */
export async function guardedStatusUpdate(opts: {
  incidentId: string;
  currentStatus: string;
  targetStatus: string;
  staff: StaffUser;
  eventType: string;
  eventPayload?: Record<string, unknown>;
  extraUpdate?: TablesUpdate<"incidents">;
}): Promise<
  | { success: true; incident: { id: string; status: string } }
  | { success: false; error: string; status: number }
> {
  const supabase = getSupabaseServiceClient();
  const {
    incidentId,
    currentStatus,
    targetStatus,
    staff,
    eventType,
    eventPayload,
    extraUpdate,
  } = opts;

  // ── Guarded update ──
  const updateData: TablesUpdate<"incidents"> = {
    status: targetStatus,
    ...extraUpdate,
  };

  const { data: updated, error: updateError } = await supabase
    .from("incidents")
    .update(updateData)
    .eq("id", incidentId)
    .eq("status", currentStatus)
    .select("id, status")
    .maybeSingle();

  if (updateError) {
    console.error("[guarded-update] Update error:", updateError.message);
    return { success: false, error: "Failed to update incident.", status: 500 };
  }

  if (!updated) {
    return {
      success: false,
      error: "Incident status has changed since you last read it. Refresh and retry.",
      status: 409,
    };
  }

  // ── Insert event ──
  const { error: eventError } = await supabase
    .from("incident_events")
    .insert({
      incident_id: incidentId,
      event_type: eventType,
      actor_id: staff.id,
      actor_role: staff.role,
      payload: {
        from: currentStatus,
        to: targetStatus,
        ...eventPayload,
      },
    });

  if (eventError) {
    console.error("[guarded-update] Event insert failed, reverting:", eventError.message);

    // Attempt to revert (guarded)
    const { error: revertError } = await supabase
      .from("incidents")
      .update({ status: currentStatus })
      .eq("id", incidentId)
      .eq("status", targetStatus);

    if (revertError) {
      console.error("[guarded-update] REVERT FAILED:", revertError.message);
      // Status is now inconsistent with events — known MVP limitation
    }

    return {
      success: false,
      error: "Failed to record audit event. Status change was reverted.",
      status: 500,
    };
  }

  return { success: true, incident: updated };
}
