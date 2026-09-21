import { NextResponse } from "next/server";
import crypto from "crypto";
import { processIncident } from "@/lib/agent/process";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, withErrorHandler } from "@/lib/api/errors";
import { getStaffUser } from "@/lib/auth/roles";
import { checkRateLimit, getRateLimitKey } from "@/lib/api/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

// Rate limit: 30 process calls per minute per IP
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

/**
 * Constant-time comparison of two strings.
 * Returns true if both are non-empty and equal.
 */
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a, "utf8");
    const bufB = Buffer.from(b, "utf8");
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export const POST = withErrorHandler(
  async (request: Request, context: unknown) => {
    const ctx = context as { params: Promise<{ id: string }> };
    const { id: incidentId } = await ctx.params;

    // ── Rate limit ──
    const rlKey = getRateLimitKey(request, "process-incident");
    const rl = checkRateLimit(rlKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rl.allowed) {
      return errorResponse("RATE_LIMITED", "Too many process requests. Try again later.", true);
    }

    // ── Auth: staff session OR x-internal-secret ──
    const internalSecret = process.env.INTERNAL_API_SECRET;
    const headerSecret = request.headers.get("x-internal-secret");
    const isInternalAuth = !!internalSecret && !!headerSecret && safeCompare(headerSecret, internalSecret);

    let isStaff = false;
    if (!isInternalAuth) {
      const staff = await getStaffUser(request);
      if (!staff) {
        return errorResponse("UNAUTHORIZED", "Requires staff session or internal secret.", false);
      }
      isStaff = true;
    }

    // ── Parse body ──
    let body: { force?: boolean } = {};
    try {
      body = await request.json();
    } catch {
      // empty body is fine, defaults to no force
    }

    const force = body.force ?? false;

    // force=true is staff-only — refuse with 403 for secret-only callers
    if (force && !isStaff) {
      return errorResponse(
        "FORBIDDEN",
        "force=true is only allowed for authenticated staff users.",
        false
      );
    }

    // ── Verify incident exists ──
    const supabase = getSupabaseServiceClient();
    const { data: incident } = await supabase
      .from("incidents")
      .select("id")
      .eq("id", incidentId)
      .maybeSingle();

    if (!incident) {
      return errorResponse("NOT_FOUND", "Incident not found.", false);
    }

    // ── Run processing ──
    const result = await processIncident(incidentId, { force });

    return NextResponse.json(
      {
        ai_status: result.aiStatus,
        status: result.status,
        skipped: result.skipped || false,
      },
      { status: 200 }
    );
  }
);
