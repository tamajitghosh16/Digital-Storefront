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
 * Service-role key for the auth project — bypasses RLS. Used by the (not yet
 * built) Owner staff-invite flow, which calls the Supabase Admin API against
 * the admin project. Falls back to the storefront project's key when the
 * admin project isn't configured yet.
 */
export function authSupabaseServiceRoleKey(): string {
  return (process.env.AUTH_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)!;
}
