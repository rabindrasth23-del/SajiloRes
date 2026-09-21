import { NextResponse, after } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, withErrorHandler } from "@/lib/api/errors";
import { CreateIncidentSchema } from "@/lib/validation/schemas";
import { processIncident } from "@/lib/agent/process";
import {
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/api/rate-limit";

// Node runtime, not edge
export const runtime = "nodejs";
export const maxDuration = 60;

// Rate limit: 30 incident submissions per minute per IP
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

export const POST = withErrorHandler(async (request: Request) => {
  // Rate limit
  const rlKey = getRateLimitKey(request, "create-incident");
  const rl = checkRateLimit(rlKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rl.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many incident submissions. Try again later.",
      true
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON body.", false);
  }

  // Validate
  const parsed = CreateIncidentSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResponse(
      "VALIDATION_ERROR",
      `${firstIssue.path.join(".")}: ${firstIssue.message}`,
      false
    );
  }

  const input = parsed.data;
  const supabase = getSupabaseServiceClient();

  // ── Idempotency: check for existing incident with this client_id ──
  const { data: existingRows } = await supabase
    .from("incidents")
    .select("id, status")
    .eq("client_id", input.client_id)
    .limit(1);

  const existing = existingRows?.[0];

  if (existing) {
    return NextResponse.json(
      {
        incident_id: existing.id,
        status: existing.status,
        duplicate: true,
      },
      { status: 200 }
    );
  }

  // ── Validate attachment_paths ownership ──
  for (const att of input.attachment_paths) {
    if (!att.storage_path.startsWith(`incidents/${input.client_id}/`)) {
      return errorResponse(
        "VALIDATION_ERROR",
        `attachment_paths: storage_path must start with incidents/${input.client_id}/`,
        false
      );
    }
  }

  // ── Verify attachment objects exist in storage (Part 0b) ──
  // NEVER fail or reject the report because of a missing photo.
  // Insert the incident anyway, skip attachment rows for missing files,
  // and log an `attachment_missing` event listing the skipped paths.
  const verifiedAttachments: typeof input.attachment_paths = [];
  const missingAttachments: string[] = [];

  for (const att of input.attachment_paths) {
    // Use download with range 0-0 to check existence without fetching full file
    const { error: headError } = await supabase.storage
      .from("incident-attachments")
      .createSignedUrl(att.storage_path, 5); // 5s throwaway signed URL to check existence

    if (headError) {
      console.warn(
        `[create-incident] Attachment not found in storage: ${att.storage_path}`,
        headError.message
      );
      missingAttachments.push(att.storage_path);
    } else {
      verifiedAttachments.push(att);
    }
  }

  // ── Insert incident ──
  const { data: insertedRows, error: insertError } = await supabase
    .from("incidents")
    .insert({
      client_id: input.client_id,
      raw_text: input.raw_text,
      status: "new",
      ai_status: "pending",
      incident_type: input.incident_type ?? null,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      location_text: input.location_text ?? null,
      location_source: input.location_source,
      offline_created: input.offline_created,
    })
    .select("id, status");

  // ── Handle unique constraint race (Postgres error 23505) ──
  if (insertError) {
    if (insertError.code === "23505") {
      // Race condition: another request inserted first
      const { data: racedRows } = await supabase
        .from("incidents")
        .select("id, status")
        .eq("client_id", input.client_id)
        .limit(1);

      const raced = racedRows?.[0];

      if (raced) {
        return NextResponse.json(
          {
            incident_id: raced.id,
            status: raced.status,
            duplicate: true,
          },
          { status: 200 }
        );
      }
    }

    console.error("[create-incident] Insert error:", insertError.message);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to create incident.",
      true
    );
  }

  const incident = insertedRows?.[0];
  if (!incident) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to create incident.",
      true
    );
  }

  // ── Insert verified attachments only ──
  if (verifiedAttachments.length > 0) {
    const attachmentRows = verifiedAttachments.map((att) => ({
      incident_id: incident.id,
      storage_path: att.storage_path,
      mime_type: att.mime_type,
      size_bytes: att.size_bytes,
    }));

    const { error: attError } = await supabase
      .from("attachments")
      .insert(attachmentRows);

    if (attError) {
      console.error(
        "[create-incident] Attachment insert error:",
        attError.message
      );
    }
  }

  // ── Log missing attachments as an event (Part 0b) ──
  if (missingAttachments.length > 0) {
    await supabase.from("incident_events").insert({
      incident_id: incident.id,
      event_type: "attachment_missing",
      actor_role: "system",
      actor_id: null,
      payload: {
        skipped_paths: missingAttachments,
        message: `${missingAttachments.length} attachment(s) not found in storage and skipped`,
      },
    });
  }

  // ── Insert audit event ──
  const { error: eventError } = await supabase
    .from("incident_events")
    .insert({
      incident_id: incident.id,
      event_type: "report_received",
      actor_role: "citizen",
      actor_id: null,
      payload: {
        client_id: input.client_id,
        offline_created: input.offline_created,
        location_source: input.location_source,
      },
    });

  if (eventError) {
    console.error(
      "[create-incident] Event insert error:",
      eventError.message
    );
  }

  // ── Trigger AI pipeline AFTER the response (never blocks citizen) ──
  after(async () => {
    try {
      await processIncident(incident.id);
    } catch (err) {
      console.error("[create-incident] processIncident error:", err);
    }
  });

  return NextResponse.json(
    {
      incident_id: incident.id,
      status: "new",
      duplicate: false,
    },
    { status: 200 }
  );
});

// ─── GET /api/incidents — staff list with filters + cursor pagination ───

import { requireStaffOrError, isStaffUser } from "@/lib/auth/roles";
import { ListIncidentsQuerySchema } from "@/lib/validation/schemas";

// Dashboard list fields
const LIST_FIELDS =
  "id, status, triage, incident_type, raw_text, summary, latitude, longitude, location_text, created_at, updated_at, ai_status, verification_status, confidence, needs_human_review";

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

  const parsed = ListIncidentsQuerySchema.safeParse(params);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResponse(
      "VALIDATION_ERROR",
      `${firstIssue.path.join(".")}: ${firstIssue.message}`,
      false
    );
  }

  const { status: statusFilter, triage: triageFilter, limit, cursor } = parsed.data;
  const supabase = getSupabaseServiceClient();

  let query = supabase
    .from("incidents")
    .select(LIST_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusFilter && statusFilter.length > 0) {
    query = query.in("status", statusFilter);
  }

  if (triageFilter && triageFilter.length > 0) {
    query = query.in("triage", triageFilter);
  }

  // Opaque cursor: base64url-encoded JSON { created_at, id }
  // Provides stable tiebreak and avoids URL-encoding issues with raw timestamps
  if (cursor) {
    try {
      const decoded = JSON.parse(
        Buffer.from(cursor, "base64url").toString("utf8")
      );
      const { created_at: cursorTs, id: cursorId } = decoded;
      if (cursorTs && cursorId) {
        // Use (created_at, id) as a composite cursor for stable ordering
        query = query.or(
          `created_at.lt.${cursorTs},and(created_at.eq.${cursorTs},id.lt.${cursorId})`
        );
      }
    } catch {
      return errorResponse("VALIDATION_ERROR", "Invalid cursor.", false);
    }
  }

  // Add secondary sort by id for stable tiebreak
  query = query.order("id", { ascending: false });

  const { data, error } = await query;

  if (error) {
    console.error("[list-incidents] Query error:", error.message);
    return errorResponse("INTERNAL_ERROR", "Failed to list incidents.", true);
  }

  let nextCursor: string | null = null;
  if (data && data.length === limit) {
    const last = data[data.length - 1];
    nextCursor = Buffer.from(
      JSON.stringify({ created_at: last.created_at, id: last.id }),
      "utf8"
    ).toString("base64url");
  }

  return NextResponse.json(
    {
      data,
      next_cursor: nextCursor,
      count: data?.length ?? 0,
    },
    { status: 200 }
  );
});
