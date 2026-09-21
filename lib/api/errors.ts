import "server-only";

import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// ─── Standard error codes per TRD §8.2 ───
export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "AI_TIMEOUT"
  | "AI_INVALID_OUTPUT"
  | "NOTIFICATION_FAILED"
  | "MAP_UNAVAILABLE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR";

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
    request_id: string;
  };
}

const STATUS_MAP: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  AI_TIMEOUT: 504,
  AI_INVALID_OUTPUT: 502,
  NOTIFICATION_FAILED: 502,
  MAP_UNAVAILABLE: 503,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

/**
 * Create a standard error response per TRD §8.2.
 * Never leaks stack traces or raw DB errors to clients.
 */
export function errorResponse(
  code: ErrorCode,
  message: string,
  retryable = false
): NextResponse<ApiError> {
  const status = STATUS_MAP[code] ?? 500;
  return NextResponse.json(
    {
      error: {
        code,
        message,
        retryable,
        request_id: uuidv4(),
      },
    },
    { status }
  );
}

/**
 * Wraps a route handler so uncaught errors become INTERNAL_ERROR.
 * Never leaks stack traces or raw DB error messages to clients.
 */
export function withErrorHandler(
  handler: (request: Request, context?: unknown) => Promise<NextResponse>
) {
  return async (request: Request, context?: unknown): Promise<NextResponse> => {
    try {
      return await handler(request, context);
    } catch (err: unknown) {
      console.error("[INTERNAL_ERROR]", err);
      return errorResponse(
        "INTERNAL_ERROR",
        "An unexpected error occurred.",
        true
      );
    }
  };
}
