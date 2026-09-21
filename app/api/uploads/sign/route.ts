import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getSupabaseServiceClient } from "@/lib/supabase/server";
import { errorResponse, withErrorHandler } from "@/lib/api/errors";
import { SignUploadSchema } from "@/lib/validation/schemas";
import {
  checkRateLimit,
  getRateLimitKey,
} from "@/lib/api/rate-limit";

// Node runtime, not edge
export const runtime = "nodejs";

// Rate limit: 20 sign requests per minute per IP
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const POST = withErrorHandler(async (request: Request) => {
  // Rate limit
  const rlKey = getRateLimitKey(request, "upload-sign");
  const rl = checkRateLimit(rlKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  if (!rl.allowed) {
    return errorResponse(
      "RATE_LIMITED",
      "Too many upload sign requests. Try again later.",
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
  const parsed = SignUploadSchema.safeParse(body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return errorResponse(
      "VALIDATION_ERROR",
      `${firstIssue.path.join(".")}: ${firstIssue.message}`,
      false
    );
  }

  const { client_id, mime_type, size_bytes } = parsed.data;
  const ext = MIME_TO_EXT[mime_type];
  const fileId = uuidv4();
  const storagePath = `incidents/${client_id}/${fileId}.${ext}`;

  // Create signed upload URL using service role
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.storage
    .from("incident-attachments")
    .createSignedUploadUrl(storagePath);

  if (error) {
    console.error("[upload-sign] Storage error:", error.message);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to create signed upload URL.",
      true
    );
  }

  return NextResponse.json(
    {
      storage_path: storagePath,
      signed_url: data.signedUrl,
      token: data.token,
    },
    { status: 200 }
  );
});
