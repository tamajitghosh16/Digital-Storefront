/**
 * The storefront's public origin, for absolute URLs (sitemap, robots.txt).
 *
 * `NEXT_PUBLIC_STOREFRONT_URL` is the same variable apps/admin uses for its
 * "View storefront" link — set it to the canonical `https://www.<domain>` in
 * production. On Vercel without it, the project's production domain is the
 * next best guess; locally, the dev server.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
