import { createHash, timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, after, type NextRequest } from "next/server";
import { z } from "zod";
import { ALL_TAGS, isAllowedTag } from "@repo/cache/tags";
import { RATE_LIMITS, clientIp, rateLimit } from "@repo/security/rate-limit";
import { securityEvent } from "@repo/security/log";
import { warmProductImages } from "@/lib/image-warm";
import { siteUrl } from "@/lib/site-url";

/**
 * Expires the storefront's cached reads (lib/cms.ts, lib/products-cache.ts)
 * on demand.
 *
 * apps/admin calls this after every save that changes storefront-visible
 * CMS or product data (apps/admin/lib/storefront-cache.ts) — the two apps
 * are separate deployments, so admin's own revalidateTag() can't reach
 * this app's process. Authenticated with a shared bearer secret,
 * `STOREFRONT_REVALIDATE_SECRET`, set identically in both apps. Unset here
 * means the endpoint is off and the cache falls back to its time-based
 * expiry. (With `CACHE_STORE=redis`, admin also writes the same
 * invalidation straight into Redis, so this ping is the second path, not
 * the only one.)
 *
 * Body (JSON, optional — the contract in apps/admin/testing/contracts):
 *   { "tags": ["cms:faqs"], "productIds": ["…"] }
 * `tags` names what changed (packages/cache/src/tags.ts; anything outside
 * that taxonomy is refused). `productIds` are the products whose cover
 * images to pre-build. No body — an older admin deploy — expires
 * everything and re-warms every cover, as this route always used to.
 *
 * The only effects are cache misses and a background image warm-up, so the
 * worst a caller holding the secret can do is cost the storefront some
 * queries and image work — and it's rate-limited.
 */

const pingSchema = z.object({
  tags: z.array(z.string().max(256).refine(isAllowedTag, "unknown cache tag")).max(128).optional(),
  productIds: z
    .array(z.string().regex(/^[A-Za-z0-9_-]{1,64}$/))
    .max(200)
    .optional(),
});

type Ping = z.infer<typeof pingSchema>;

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

  const ping = await readPing(request);
  if (!ping) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  // `expire: 0` — gone now, not stale-while-revalidate: the editor who just
  // saved should see their change on their very next storefront page view.
  const tags = ping.tags ?? ALL_TAGS;
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  // A save may have added or re-imaged a product: build its resized covers
  // now, after responding, rather than on the first shopper's visit. A
  // CMS-only save names no products and warms nothing.
  const productIds = ping.productIds;
  if (!productIds || productIds.length > 0) {
    // The configured storefront origin, never the request's: `nextUrl.origin`
    // comes from the Host header, so it would let whoever reaches this route
    // choose where the server sends its warm-up fetches (SSRF). Admin pings
    // this same NEXT_PUBLIC_STOREFRONT_URL, so the warm-up reaches the site
    // that was pinged — on Hostinger as on Vercel (instrumentation.ts refuses
    // to boot a Hostinger build without it).
    const origin = siteUrl();
    after(async () => {
      try {
        const { warmed, failed } = await warmProductImages(origin, productIds);
        if (failed > 0) console.warn(`[revalidate] warmed ${warmed} cover images, ${failed} failed`);
      } catch (error) {
        console.error("[revalidate] cover image warm-up failed", error);
      }
    });
  }
  return NextResponse.json({ revalidated: true, expired: tags.length }, { headers: { "Cache-Control": "no-store" } });
}

/** The parsed body, `{}` for none, or null when it isn't a valid ping. */
async function readPing(request: NextRequest): Promise<Ping | null> {
  const text = await request.text();
  if (!text.trim()) return {};
  try {
    const parsed = pingSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Constant-time compare; hashing first sidesteps timingSafeEqual's equal-length requirement. */
function matchesSecret(received: string, expected: string): boolean {
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(received), digest(expected));
}
