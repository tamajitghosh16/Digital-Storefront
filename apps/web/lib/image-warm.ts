import "server-only";
import { prisma } from "@repo/database";

/**
 * Pre-builds the `/_next/image` copies of every published product cover, so
 * no shopper is the first to ask for one.
 *
 * Covers are stored as full-size scans (up to ~2 MB). The optimizer serves a
 * resized WebP in ~20 ms once it has made it, but making it — downloading
 * the original from Supabase, then resizing — takes 1–2 s, and without
 * this the first shopper to see each cover at each width pays that. The
 * storefront's `/api/revalidate` runs this (in `after()`) whenever apps/admin
 * saves, so a newly added or re-imaged product is warm before anyone opens
 * its page. Covers already cached answer in milliseconds, so re-warming the
 * whole catalogue is cheap.
 *
 * {@link WARM_WIDTHS} are the srcset widths the browser picks for the
 * listing card (`BookCard`'s `sizes`) and product tiles at 1x–2x screens,
 * plus the detail-page gallery. The URL must match `next/image`'s default
 * loader exactly (`url`, `w`, `q=75`, WebP `Accept`) to land on the same
 * cache entry a browser will request.
 */

const WARM_WIDTHS = [256, 384, 640, 828];
const QUALITY = 75;
const CONCURRENCY = 6;

export async function warmProductImages(origin: string): Promise<{ warmed: number; failed: number }> {
  const rows = await prisma.product.findMany({
    where: { isPublished: true, coverImageUrl: { not: null } },
    select: { coverImageUrl: true },
    distinct: ["coverImageUrl"],
  });

  const urls = rows.flatMap((row) =>
    WARM_WIDTHS.map(
      (width) => `${origin}/_next/image?url=${encodeURIComponent(row.coverImageUrl!)}&w=${width}&q=${QUALITY}`
    )
  );

  let warmed = 0;
  let failed = 0;
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++]!;
      try {
        const response = await fetch(url, {
          headers: { Accept: "image/webp,image/*" },
          cache: "no-store",
          signal: AbortSignal.timeout(20_000),
        });
        // Drain the body so the optimizer finishes writing its cache entry.
        await response.arrayBuffer();
        if (response.ok) warmed++;
        else failed++;
      } catch {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { warmed, failed };
}
