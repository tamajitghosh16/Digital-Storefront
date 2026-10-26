import "server-only";
import { after } from "next/server";

/**
 * Tell apps/web to drop its cached CMS reads (apps/web/lib/cms.ts) and
 * catalogue reads (apps/web/lib/products-cache.ts) so a save made here shows
 * on the storefront's very next page view.
 *
 * Call it from any Server Action that changes storefront-visible CMS data —
 * site settings, navigation, pricing, homepage copy, banners, testimonials,
 * FAQs, the Products Menu — or any `Product` row (the catalogue forms,
 * receiving purchase-order stock), alongside its revalidatePath() calls, which
 * only reach this app's own cache. Call it before any redirect(): it
 * schedules the request with `after()`, so the editor's redirect isn't held
 * up waiting on the storefront, and a storefront that's down never fails the
 * save.
 *
 * No-op unless `STOREFRONT_REVALIDATE_SECRET` and `NEXT_PUBLIC_STOREFRONT_URL`
 * are both set; the storefront's cache then catches up on its own within a
 * minute.
 */
export function revalidateStorefront(): void {
  const secret = process.env.STOREFRONT_REVALIDATE_SECRET?.trim();
  const storefrontUrl = process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim();
  if (!secret || !storefrontUrl) return;

  after(async () => {
    try {
      const response = await fetch(new URL("/api/revalidate", storefrontUrl), {
        method: "POST",
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      });
      if (!response.ok) {
        console.error(`[storefront-cache] revalidate returned ${response.status}; storefront catches up within a minute`);
      }
    } catch (error) {
      console.error("[storefront-cache] revalidate request failed; storefront catches up within a minute", error);
    }
  });
}
