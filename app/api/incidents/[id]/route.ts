import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, withErrorHandler } from "@/lib/api/errors";
import { requireStaffOrError, isStaffUser } from "@/lib/auth/roles";

// Node runtime, not edge
export const runtime = "nodejs";

// Fields returned for citizen mode (limited)
const CITIZEN_FIELDS = "id, status, verification_status, created_at, updated_at";

// Fields returned for staff mode (full row)
const STAFF_FIELDS = "*";

export const GET = withErrorHandler(
  async (
    request: Request,
    context: unknown
  ) => {
    const ctx = context as { params: Promise<{ id: string }> };
    const { id } = await ctx.params;

    if (!id) {
      return errorResponse("VALIDATION_ERROR", "Missing incident ID.", false);
    }

    const supabase = getSupabaseServiceClient();
    const url = new URL(request.url);
    const clientId = url.searchParams.get("client_id");

    // ── Staff mode: valid Bearer token with role ──
    const authHeader = request.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const staffOrError = await requireStaffOrError(
        request,
        "responder",
        "coordinator",
        "admin"
      );

      if (!isStaffUser(staffOrError)) return staffOrError;

      const { data, error } = await supabase
        .from("incidents")
        .select(STAFF_FIELDS)
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        return errorResponse("NOT_FOUND", "Incident not found.", false);
      }

      return NextResponse.json(data, { status: 200 });
    }

    // ── Citizen mode: requires ?client_id= ──
    if (clientId) {
      const { data, error } = await supabase
        .from("incidents")
        .select(CITIZEN_FIELDS)
        .eq("id", id)
        .eq("client_id", clientId)
        .maybeSingle();

      if (error || !data) {
        return errorResponse("NOT_FOUND", "Incident not found.", false);
      }

      return NextResponse.json(data, { status: 200 });
    }

    // ── No credentials at all ──
    return errorResponse(
      "UNAUTHORIZED",
      "Provide a staff session (Authorization: Bearer) or ?client_id= to view an incident.",
      false
    );
  }
);
