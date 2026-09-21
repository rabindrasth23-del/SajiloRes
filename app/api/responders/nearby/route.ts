import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, withErrorHandler } from "@/lib/api/errors";
import { requireStaffOrError, isStaffUser } from "@/lib/auth/roles";
import { NearbyRespondersSchema } from "@/lib/validation/schemas";

export const runtime = "nodejs";

/**
 * Haversine distance in km between two lat/lng points.
 */
function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export const GET = withErrorHandler(async (request: Request) => {
  const staffOrError = await requireStaffOrError(
    request,
    "responder",
    "coordinator",
    "admin"
  );
  if (!isStaffUser(staffOrError)) return staffOrError;

  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());
  // Handle serviceTypes[] array param
  const serviceTypesRaw = url.searchParams.getAll("serviceTypes");
  if (serviceTypesRaw.length > 0) {
    params.serviceTypes = serviceTypesRaw.join(",");
  }

  const parsed = NearbyRespondersSchema.safeParse(params);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResponse(
      "VALIDATION_ERROR",
      `${firstIssue.path.join(".")}: ${firstIssue.message}`,
      false
    );
  }

  const { lat, lng, serviceTypes } = parsed.data;
  const supabase = getSupabaseServiceClient();

  // Only verified=true and available=true
  let query = supabase
    .from("responders")
    .select("id, organization, service_type, contact_person, phone, email, latitude, longitude, coverage_area")
    .eq("verified", true)
    .eq("available", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (serviceTypes && serviceTypes.length > 0) {
    query = query.in("service_type", serviceTypes);
  }

  const { data: responders, error } = await query;

  if (error) {
    console.error("[nearby] Query error:", error.message);
    return errorResponse("INTERNAL_ERROR", "Failed to fetch responders.", true);
  }

  // Calculate distance and sort nearest first
  const withDistance = (responders ?? [])
    .map((r) => ({
      ...r,
      distance_km: haversineKm(lat, lng, r.latitude!, r.longitude!),
    }))
    .sort((a, b) => a.distance_km - b.distance_km);

  return NextResponse.json({ data: withDistance }, { status: 200 });
});
