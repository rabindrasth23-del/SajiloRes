import "server-only";

/**
 * Best-effort in-memory rate limiter for serverless route handlers.
 *
 * IMPORTANT: In serverless environments (Vercel, Netlify, etc.), each
 * function invocation may run in a different isolate, so the in-memory
 * store is NOT shared across instances. This provides protection against
 * a single burst of requests hitting one instance, but it is NOT a
 * reliable global rate limiter. For production, use a Redis-backed
 * limiter (e.g. @upstash/ratelimit) or an API gateway limit.
 */

interface RateEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateEntry>();

// Cleanup stale entries every 60 seconds to avoid unbounded memory growth
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanupStale() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}

/**
 * Check rate limit for a given key.
 * Returns { allowed: true } if under limit, or
 * { allowed: false, retryAfterMs } if over limit.
 */
export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: true } | { allowed: false; retryAfterMs: number } {
  cleanupStale();

  const now = Date.now();
  const existing = store.get(key);

  if (!existing || now >= existing.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (existing.count < maxRequests) {
    existing.count++;
    return { allowed: true };
  }

  return { allowed: false, retryAfterMs: existing.resetAt - now };
}

/**
 * Extract a rate-limit key from the request.
 * Uses X-Forwarded-For header (set by Vercel/proxies), falls back to
 * a fixed key. This is best-effort — not tamper-proof.
 */
export function getRateLimitKey(request: Request, prefix: string): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${prefix}:${ip}`;
}
