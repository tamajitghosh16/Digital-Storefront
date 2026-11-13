import "server-only";
import { revalidateTag } from "next/cache";
import { after } from "next/server";
import { writeTagLedger } from "@repo/cache/invalidate";

/**
 * Tell the storefront exactly what a save here changed, so it shows on the
 * storefront's very next page view — and nothing else is thrown away.
 *
 * `tags` come from the shared taxonomy (@repo/cache/tags): `cmsChangedTags(…)`
 * for a CMS section, `productChangedTags(before, after)` for a catalogue
 * edit, `stockReturnedTags(…)` when copies come back. `productIds` are the
 * products whose cover images the storefront should pre-build (a catalogue
 * save); leave it empty for anything else.
 *
 * Three things happen:
 *  1. The tags expire in this app's own cache (the CMS chrome admin itself
 *     caches — app/layout.tsx — and anything else tagged the same way).
 *  2. With `CACHE_STORE=redis`, the invalidation is written straight into
 *     the storefront's Redis tag ledger (@repo/cache/invalidate). This lands
 *     even while the storefront is asleep or restarting, and every
 *     storefront process honours it within a second.
 *  3. The storefront's `/api/revalidate` is pinged (bearer
 *     `STOREFRONT_REVALIDATE_SECRET`), which expires the tags in its own
 *     process and pre-builds the named covers. This is the only path when
 *     the storefront uses Next's built-in cache.
 *
 * 2 and 3 run in `after()`, so the editor's redirect isn't held up and a
 * storefront that's down never fails the save. Call it before any
 * redirect(). If both are unconfigured or fail, the storefront catches up
 * within its cache TTL (packages/cache/src/policy.ts).
 */
export function revalidateStorefront(tags: readonly string[], productIds: readonly string[] = []): void {
  const unique = [...new Set(tags)];
  if (unique.length === 0) return;

  for (const tag of unique) revalidateTag(tag, { expire: 0 });

  after(async () => {
    await Promise.all([writeTagLedger(unique), pingStorefront(unique, productIds)]);
  });
}

async function pingStorefront(tags: readonly string[], productIds: readonly string[]): Promise<void> {
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET?.trim();
  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim();
  if (!secret || !storefrontUrl) return;

  try {
    const response = await fetch(new URL("/api/revalidate", storefrontUrl), {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tags, productIds }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      console.error(`[storefront-cache] revalidate returned ${response.status}; storefront catches up within its cache TTL`);
    }
  } catch (error) {
    console.error("[storefront-cache] revalidate request failed; storefront catches up within its cache TTL", error);
  }
}
