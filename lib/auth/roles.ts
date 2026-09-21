import "server-only";

import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/api/errors";

export type StaffRole = "responder" | "coordinator" | "admin";

export interface StaffUser {
  id: string;
  role: StaffRole;
  organization_id: string | null;
  display_name: string | null;
}

/**
 * Verify a Supabase JWT from the request and look up the user's role
 * in app_users using the service role client. Never trusts a role claim
 * from the client — always reads from the database.
 *
 * Returns null if:
 *   - No Authorization header / session cookie
 *   - Token is invalid or expired
 *   - User has no app_users row (no role assigned)
 */
export async function getStaffUser(
  request: Request
): Promise<StaffUser | null> {
  const supabase = getSupabaseServiceClient();

  // Extract the Bearer token from the Authorization header
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) return null;

  // Verify the JWT and get the user ID
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) return null;

  // Look up the role in app_users (service role bypasses RLS)
  const { data: appUser, error: dbError } = await supabase
    .from("app_users")
    .select("id, role, organization_id, display_name")
    .eq("id", user.id)
    .single();

  if (dbError || !appUser) return null;

  return appUser as StaffUser;
}

/**
 * Require the request to come from a staff user with one of the
 * allowed roles. Returns the StaffUser or null.
 */
export async function requireRole(
  request: Request,
  ...allowedRoles: StaffRole[]
): Promise<StaffUser | null> {
  const staff = await getStaffUser(request);
  if (!staff) return null;
  if (!allowedRoles.includes(staff.role)) return null;
  return staff;
}

/**
 * Standard staff authentication gate for route handlers.
 * Returns the StaffUser or a NextResponse error:
 *   - 401 UNAUTHORIZED: no token or invalid token
 *   - 403 FORBIDDEN: valid user but no app_users row (no role)
 */
export async function requireStaffOrError(
  request: Request,
  ...allowedRoles: StaffRole[]
): Promise<StaffUser | NextResponse> {
  const supabase = getSupabaseServiceClient();

  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return errorResponse("UNAUTHORIZED", "Missing or invalid authorization token.", false);
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return errorResponse("UNAUTHORIZED", "Invalid or expired token.", false);
  }

  // Look up the role in app_users
  const { data: appUser, error: dbError } = await supabase
    .from("app_users")
    .select("id, role, organization_id, display_name")
    .eq("id", user.id)
    .single();

  if (dbError || !appUser) {
    return errorResponse("FORBIDDEN", "User has no assigned role.", false);
  }

  const staff = appUser as StaffUser;

  if (allowedRoles.length > 0 && !allowedRoles.includes(staff.role)) {
    return errorResponse("FORBIDDEN", `Requires one of: ${allowedRoles.join(", ")}`, false);
  }

  return staff;
}

/** Type guard: is the result a StaffUser (not an error response)? */
export function isStaffUser(
  result: StaffUser | NextResponse
): result is StaffUser {
  return "id" in result && "role" in result;
}
