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

export class ApiException extends Error {
  public code: ErrorCode;
  public retryable: boolean;
  public request_id: string;

  constructor(apiError: ApiError["error"], public status: number) {
    super(apiError.message);
    this.name = "ApiException";
    this.code = apiError.code;
    this.retryable = apiError.retryable;
    this.request_id = apiError.request_id;
  }
}

/**
 * Enhanced fetch wrapper for API routes that:
 * 1. Automatically injects the staff Bearer token (if provided).
 * 2. Parses the TRD §8.2 standard error response.
 * 3. Throws an ApiException on failure so errors are never silently swallowed.
 */
export async function apiFetch<T>(
  url: string,
  options: RequestInit = {},
  accessToken?: string
): Promise<T> {
  const headers = new Headers(options.headers);

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Ensure JSON headers if body is an object and not FormData
  if (
    options.body &&
    typeof options.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorData: ApiError | undefined;
    try {
      errorData = await response.json();
    } catch {
      // Fallback for non-JSON errors (e.g. 502 Bad Gateway from host)
      throw new ApiException(
        {
          code: "INTERNAL_ERROR",
          message: `HTTP ${response.status} ${response.statusText}`,
          retryable: true,
          request_id: "unknown",
        },
        response.status
      );
    }

    if (errorData?.error) {
      throw new ApiException(errorData.error, response.status);
    }

    throw new ApiException(
      {
        code: "INTERNAL_ERROR",
        message: "An unknown error occurred.",
        retryable: false,
        request_id: "unknown",
      },
      response.status
    );
  }

  return response.json();
}
