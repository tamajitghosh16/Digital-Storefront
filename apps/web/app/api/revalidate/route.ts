import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, after, type NextRequest } from "next/server";
import { RATE_LIMITS, clientIp, rateLimit } from "@repo/security/rate-limit";
import { securityEvent } from "@repo/security/log";
import { CMS_CACHE_TAG } from "@/lib/cms";
import { PRODUCTS_CACHE_TAG } from "@/lib/products-cache";
import { warmProductImages } from "@/lib/image-warm";

/**
 * Expires the storefront's cached CMS reads (lib/cms.ts) and catalogue reads
 * (lib/products-cache.ts) on demand.
 *
 * apps/admin calls this after every save that changes storefront-visible
 * CMS or product data (see apps/admin/lib/storefront-cache.ts) — the two apps are
 * separate deployments, so admin's own revalidatePath() can't reach this
 * app's cache. Authenticated with a shared bearer secret,
 * `STOREFRONT_REVALIDATE_SECRET`, set identically in both apps. Unset here
 * means the endpoint is off and the cache falls back to its time-based
 * expiry.
 *
 * The only effects are a cache miss on the next page view and a background
 * re-warm of the product cover images (lib/image-warm.ts), so the worst a
 * caller holding the secret can do is cost the storefront some queries and
 * image work — and it's rate-limited.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!(await rateLimit(RATE_LIMITS.cacheRevalidate, clientIp(request.headers))).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": "60" } });
  }

  if (!matchesSecret(request.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    securityEvent("revalidate.unauthorized", { ip: clientIp(request.headers) });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // `expire: 0` — gone now, not stale-while-revalidate: the editor who just
  // saved should see their change on their very next storefront page view.
  // Both tags, every time: a ping doesn't say what changed, and a miss only
  // costs one round of queries.
  revalidateTag(CMS_CACHE_TAG, { expire: 0 });
  revalidateTag(PRODUCTS_CACHE_TAG, { expire: 0 });

  // A save may have added or re-imaged a product: build its resized covers
  // now, after responding, rather than on the first shopper's visit.
  const origin = request.nextUrl.origin;
  after(async () => {
    try {
      const { warmed, failed } = await warmProductImages(origin);
      if (failed > 0) console.warn(`[revalidate] warmed ${warmed} cover images, ${failed} failed`);
    } catch (error) {
      console.error("[revalidate] cover image warm-up failed", error);
    }
  });
  return NextResponse.json({ revalidated: true }, { headers: { "Cache-Control": "no-store" } });
}

/** Constant-time compare; hashing first sidesteps timingSafeEqual's equal-length requirement. */
function matchesSecret(received: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(received), digest(expected));
}
