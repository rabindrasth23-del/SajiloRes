import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, withErrorHandler } from "@/lib/api/errors";
import { requireStaffOrError, isStaffUser } from "@/lib/auth/roles";

export const runtime = "nodejs";

export const GET = withErrorHandler(
  async (request: Request, context: unknown) => {
    const ctx = context as { params: Promise<{ id: string }> };
    const { id } = await ctx.params;

    const staffOrError = await requireStaffOrError(
      request,
      "responder",
      "coordinator",
      "admin"
    );
    if (!isStaffUser(staffOrError)) return staffOrError;

    const supabase = getSupabaseServiceClient();

    // Verify incident exists
    const { data: incident } = await supabase
      .from("incidents")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (!incident) {
      return errorResponse("NOT_FOUND", "Incident not found.", false);
    }

    // Fetch all events, oldest first
    const { data: events, error } = await supabase
      .from("incident_events")
      .select("*")
      .eq("incident_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[events] Query error:", error.message);
      return errorResponse("INTERNAL_ERROR", "Failed to fetch events.", true);
    }

    return NextResponse.json({ data: events }, { status: 200 });
  }
);
