import { securityEvent } from "./log";

/**
 * Fixed-window rate limiting for Server Actions and Route Handlers.
 *
 * Backed by Upstash Redis over its REST API when `UPSTASH_REDIS_REST_URL` +
 * `UPSTASH_REDIS_REST_TOKEN` are set — the only option that actually holds
 * across Vercel's many serverless instances. Without them it falls back to
 * an in-process counter, which still stops a single hot loop against one
 * instance but is *not* a real limit in production (a warning is logged
 * once). No SDK dependency: two REST commands in one pipeline call.
 *
 * Fails open on a Redis error — an outage of the limiter shouldn't take
 * checkout down with it — and logs a security event so it's noticed.
 */

export interface RateLimitRule {
  /** Short, stable name for the protected operation, e.g. "checkout.start". */
  name: string;
  /** Max requests per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the current window resets. */
  retryAfterSeconds: number;
}

const memory = new Map<string, { count: number; resetAt: number }>();
let warnedNoRedis = false;

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function incrementUpstash(key: string, windowMs: number, config: { url: string; token: string }): Promise<number> {
  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
    body: JSON.stringify([
      ["INCR", key],
      ["PEXPIRE", key, String(windowMs)],
    ]),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Upstash responded ${response.status}`);
  const results = (await response.json()) as { result?: number; error?: string }[];
  const count = results[0]?.result;
  if (typeof count !== "number") throw new Error(results[0]?.error ?? "Unexpected Upstash response");
  return count;
}

function incrementMemory(key: string, windowMs: number, now: number): number {
  const entry = memory.get(key);
  if (!entry || entry.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    // Opportunistic cleanup so the map can't grow without bound.
    if (memory.size > 10_000) {
      for (const [k, v] of memory) if (v.resetAt <= now) memory.delete(k);
    }
    return 1;
  }
  entry.count += 1;
  return entry.count;
}

/**
 * Count one hit for `identifier` (a user id, an IP, or both joined) against
 * `rule`. Returns `ok: false` once the window's limit is exceeded.
 */
export async function rateLimit(rule: RateLimitRule, identifier: string): Promise<RateLimitResult> {
  const now = Date.now();
  const windowMs = rule.windowSeconds * 1000;
  const windowIndex = Math.floor(now / windowMs);
  const key = `rl:${rule.name}:${identifier}:${windowIndex}`;
  const retryAfterSeconds = Math.max(1, Math.ceil(((windowIndex + 1) * windowMs - now) / 1000));

  let count: number;
  const config = upstashConfig();
  if (config) {
    try {
      count = await incrementUpstash(key, windowMs, config);
    } catch (error) {
      securityEvent("rate_limit.backend_error", { rule: rule.name, error: String(error) });
      return { ok: true, remaining: rule.limit, retryAfterSeconds };
    }
  } else {
    if (!warnedNoRedis && process.env.NODE_ENV === "production") {
      warnedNoRedis = true;
      console.warn(
        "[security] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limits are per-instance only and will not hold across serverless instances."
      );
    }
    count = incrementMemory(key, windowMs, now);
  }

  const ok = count <= rule.limit;
  if (!ok && count === rule.limit + 1) {
    // Log the first rejection per window, not every one.
    securityEvent("rate_limit.exceeded", { rule: rule.name, identifier });
  }
  return { ok, remaining: Math.max(0, rule.limit - count), retryAfterSeconds };
}

/**
 * Best-effort client IP from proxy headers. On Vercel, `x-real-ip` and the
 * first `x-forwarded-for` hop are set by the platform and can't be spoofed
 * past it; elsewhere treat this as a hint, not an identity.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return headers.get("x-real-ip")?.trim() || forwarded || "unknown";
}

/** Shared limits, so the numbers live in one place. */
export const RATE_LIMITS = {
  checkoutStart: { name: "checkout.start", limit: 10, windowSeconds: 60 },
  checkoutConfirm: { name: "checkout.confirm", limit: 20, windowSeconds: 60 },
  couponCheck: { name: "checkout.coupon", limit: 15, windowSeconds: 300 },
  accountWrite: { name: "account.write", limit: 60, windowSeconds: 60 },
  libraryDownload: { name: "library.download", limit: 30, windowSeconds: 300 },
  catalogueApi: { name: "api.books", limit: 120, windowSeconds: 60 },
  staffInviteAccept: { name: "staff_invite.accept", limit: 10, windowSeconds: 900 },
  adminUpload: { name: "admin.upload", limit: 60, windowSeconds: 300 },
  webhook: { name: "webhook.razorpay", limit: 300, windowSeconds: 60 },
  cacheRevalidate: { name: "api.revalidate", limit: 60, windowSeconds: 60 },
} satisfies Record<string, RateLimitRule>;
