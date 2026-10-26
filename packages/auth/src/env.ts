/**
 * Which Supabase project this app authenticates against.
 *
 * `apps/admin` runs against its **own** Supabase project (staff identities
 * only — no public signup) by setting `NEXT_PUBLIC_AUTH_SUPABASE_*`.
 * `apps/web` never sets those, so it falls back to `NEXT_PUBLIC_SUPABASE_*`
 * and keeps using the storefront project. This is deliberately separate from
 * `packages/storage`, which always uses `NEXT_PUBLIC_SUPABASE_URL` +
 * `SUPABASE_SERVICE_ROLE_KEY` (the storefront project, where the Storage
 * buckets and the shared Postgres live).
 *
 * The fallback is what lets `apps/web` share this code, but for `apps/admin`
 * it would be a fail-*open*: losing one env var would point the back office
 * at the storefront project, where anyone can sign up. So:
 *  - `apps/admin`'s proxy passes `requireDedicatedAuthProject`, which refuses
 *    every request in production when {@link isDedicatedAuthProjectConfigured}
 *    is false, and its `instrumentation.ts` refuses to boot;
 *  - the service-role key never falls back across projects once a dedicated
 *    auth project is configured (see {@link authSupabaseServiceRoleKey}).
 *
 * The `process.env.NEXT_PUBLIC_*` reads are written out in full, not via a
 * computed key, so Next.js can inline them into the client bundle at build
 * time.
 */
export function authSupabaseUrl(): string {
  return (process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)!;
}

export function authSupabasePublishableKey(): string {
  return (process.env.NEXT_PUBLIC_AUTH_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!;
}

/**
 * True when this app points its auth at a dedicated project that is not the
 * storefront project. `apps/admin` requires this in production.
 */
export function isDedicatedAuthProjectConfigured(): boolean {
  const authUrl = process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL?.trim();
  const authKey = process.env.NEXT_PUBLIC_AUTH_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!authUrl || !authKey) return false;
  const storefrontUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  return !storefrontUrl || authUrl.replace(/\/$/, "") !== storefrontUrl.replace(/\/$/, "");
}

/**
 * Service-role key for the auth project — bypasses RLS. Used server-side
 * only by the Owner staff-management flow (Supabase Admin API against the
 * admin project).
 *
 * Falls back to the storefront key only when no dedicated auth project is
 * configured at all (early local dev). Once `NEXT_PUBLIC_AUTH_SUPABASE_URL`
 * is set, a missing `AUTH_SUPABASE_SERVICE_ROLE_KEY` is an error: the
 * storefront key can't administer the admin project, and silently trying it
 * would only hide the misconfiguration.
 */
export function authSupabaseServiceRoleKey(): string {
  const dedicated = process.env.AUTH_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (dedicated) return dedicated;
  if (process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL?.trim()) {
    throw new Error(
      "AUTH_SUPABASE_SERVICE_ROLE_KEY is not set, but NEXT_PUBLIC_AUTH_SUPABASE_URL points at a dedicated auth project. Set the admin project's secret key."
    );
  }
  return process.env.SUPABASE_SERVICE_ROLE_KEY!;
}
