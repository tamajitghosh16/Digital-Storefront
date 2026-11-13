import { deploymentEnv } from "@repo/security/env";

/**
 * The storefront's public origin, for absolute URLs (sitemap, robots.txt) and
 * the cover-image warm-up `/api/revalidate` runs.
 *
 * `NEXT_PUBLIC_STOREFRONT_URL` is the same variable apps/admin uses for its
 * "View storefront" link and its cache pings — set it to the canonical
 * `https://www.<domain>` in production. On Vercel without it, the project's
 * production domain is the next best guess; locally, the dev server.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}

/**
 * Startup invariant for `instrumentation.ts`: a labelled deployment
 * (`DEPLOY_ENV`, or Vercel's `VERCEL_ENV`) that would fall through to
 * localhost — Hostinger, or any self-hosted build, without
 * `NEXT_PUBLIC_STOREFRONT_URL` — would publish a sitemap and robots.txt
 * pointing at localhost and warm cover images against nothing. Local runs
 * (no deployment label) and Vercel (which has its own fallback) pass.
 */
export function siteUrlProblem(): string | null {
  if (!deploymentEnv()) return null;
  if (process.env.NEXT_PUBLIC_STOREFRONT_URL?.trim() || process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()) return null;
  return "NEXT_PUBLIC_STOREFRONT_URL is not set — the sitemap, robots.txt and cover-image warm-up would point at http://localhost:3000. Set it to https://www.<domain> before the build";
}
