import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { prisma, type Role } from "@repo/database";
import { securityEvent } from "@repo/security/log";
import { assertRole } from "./roles";
import { authSupabasePublishableKey, authSupabaseServiceRoleKey, authSupabaseUrl } from "./env";

/**
 * Server-side Supabase client for use in Server Components, Server Actions,
 * and Route Handlers. Reads/writes the auth cookie via Next's cookies() API.
 * Talks to this app's auth project (see ./env) — the storefront project for
 * `apps/web`, the dedicated staff-only project for `apps/admin`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(authSupabaseUrl(), authSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — safe to ignore because
          // proxy.ts refreshes the session on every request.
        }
      },
    },
  });
}

/**
 * The signed-in identity (auth UID + email) from this request's session
 * cookie, or null when signed out.
 *
 * Uses `getClaims()`, not `getUser()`: both auth projects sign sessions with
 * an asymmetric (ES256) key, so the JWT's signature and expiry are verified
 * locally against the project's JWKS (cached in-process by auth-js for 10
 * minutes) instead of costing an HTTP round trip to Supabase Auth on every
 * call. A legacy HS256 token automatically falls back to a `getUser()`
 * round trip inside auth-js. An expiring session is refreshed first.
 *
 * Trade-off: a session signed out elsewhere stays valid until its access
 * token expires (the project's JWT expiry, 1h by default). Roles are still
 * read fresh from `public.users` on every request, so demoting or deleting
 * a staff member takes effect immediately.
 *
 * `cache()`d so a layout, a page and its guard asking in the same render
 * share one verification.
 */
const getSessionIdentity = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return { id: claims.sub, email: typeof claims.email === "string" ? claims.email : null };
});

/**
 * Storefront customer: the signed-in user's app-level role (READER,
 * SELF_PUB_AUTHOR, ...) plus profile, or null if signed out. Reads
 * `public.users` in the storefront Postgres via Prisma. `apps/web` only —
 * `apps/admin` authenticates against a different project whose auth UIDs
 * have no row in that table; it must use `getCurrentStaff()` instead.
 */
export const getCurrentUser = cache(async () => {
  const identity = await getSessionIdentity();
  if (!identity) return null;

  return prisma.user.findUnique({ where: { id: identity.id } });
});

export type StaffAccount = { id: string; email: string; name: string | null; role: Role };

/**
 * Back-office staff member: identity from the admin-only auth project, role
 * from that project's `public.users` table (kept in sync by the trigger in
 * packages/database/prisma/sql/sync_staff.sql). Read over Supabase REST, not
 * Prisma, because `apps/admin`'s Prisma client points at the storefront DB,
 * which has no row for this UID. Returns null when signed out or when the
 * caller has no staff row. `apps/admin` only. `cache()`d per request, like
 * {@link getSessionIdentity}.
 */
export const getCurrentStaff = cache(async (): Promise<StaffAccount | null> => {
  const identity = await getSessionIdentity();
  if (!identity) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("users")
    .select("id,email,name,role")
    .eq("id", identity.id)
    .single();
  if (!profile) return null;

  return {
    id: profile.id as string,
    email: (profile.email as string) ?? identity.email ?? "",
    name: (profile.name as string | null) ?? null,
    role: profile.role as Role,
  };
});

/**
 * Service-role client for the auth project — bypasses Row-Level Security.
 * Backs the Owner staff-invite flow, which calls the Supabase Admin API and
 * writes `public.users` against the admin-only project. Server-only; never
 * expose to the browser.
 */
export function createServiceRoleClient() {
  return createSupabaseClient(authSupabaseUrl(), authSupabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * The one-line guard for every back-office Server Action and Route Handler:
 * resolves the signed-in staff member (see `getCurrentStaff`) and throws
 * unless their role is in `allowed`.
 */
export async function requireStaff(allowed: Role[]): Promise<StaffAccount> {
  const staff = await getCurrentStaff();
  try {
    assertRole(staff?.role, allowed);
  } catch (error) {
    securityEvent("auth.forbidden", { userId: staff?.id ?? null, role: staff?.role ?? null, allowed });
    throw error;
  }
  return staff!;
}

export type StaffListEntry = StaffAccount & { createdAt: string };

/**
 * Every row in the admin auth project's `public.users` — the back office's
 * staff list. Read with the service-role key (bypasses the self-read RLS
 * policy) so the Owner's Staff & roles screen can see everyone. `apps/admin`
 * only; requires `AUTH_SUPABASE_SERVICE_ROLE_KEY`.
 */
export async function listStaffAccounts(): Promise<StaffListEntry[]> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("users")
    .select("id,email,name,role,createdAt")
    .order("createdAt", { ascending: true });
  if (error) throw new Error(`Could not read staff list: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    email: (row.email as string) ?? "",
    name: (row.name as string | null) ?? null,
    role: row.role as Role,
    createdAt: row.createdAt as string,
  }));
}

/** One staff row looked up by email, or null. Service-role. `apps/admin` only. */
export async function getStaffByEmail(email: string): Promise<StaffListEntry | null> {
  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("users")
    .select("id,email,name,role,createdAt")
    // Exact match. `ilike` would treat `_` and `%` in the address as
    // wildcards; Supabase Auth stores emails lower-cased already.
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  if (!data) return null;
  return {
    id: data.id as string,
    email: (data.email as string) ?? email,
    name: (data.name as string | null) ?? null,
    role: data.role as Role,
    createdAt: data.createdAt as string,
  };
}

/**
 * Set a staff member's role in the admin auth project's `public.users`.
 * Service-role write (the sync trigger never touches `role` on conflict, so
 * this isn't clobbered by a later auth.users sync). `apps/admin` only.
 */
export async function setStaffRole(userId: string, role: Role): Promise<void> {
  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("users")
    .update({ role, updatedAt: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(`Could not change role: ${error.message}`);
}

/**
 * Remove a staff member outright: delete their auth identity in the admin
 * auth project via the Admin API, then delete their `public.users` row.
 *
 * The profile row is deleted explicitly because `sync_staff.sql` has no
 * delete trigger and `public.users.id` has no FK to `auth.users` — so a
 * dashboard "delete user" removes only the auth identity and leaves the
 * `public.users` row (and the Staff & roles list) behind. This tolerates a
 * missing auth identity for exactly that case, so a half-deleted account
 * can still be cleaned up from the app. `apps/admin` only; requires
 * `AUTH_SUPABASE_SERVICE_ROLE_KEY`.
 */
export async function deleteStaffAccount(userId: string): Promise<void> {
  const supabase = createServiceRoleClient();

  const { error: authError } = await supabase.auth.admin.deleteUser(userId);
  // A 404 "User not found" means the auth identity is already gone (e.g.
  // deleted from the Supabase dashboard). Any other error is real.
  if (authError && !/not found/i.test(authError.message)) {
    throw new Error(`Could not delete the staff account: ${authError.message}`);
  }

  const { error: rowError } = await supabase.from("users").delete().eq("id", userId);
  if (rowError) throw new Error(`Could not delete the staff record: ${rowError.message}`);
}

/**
 * Create a staff auth identity (email + password, pre-confirmed) in the
 * admin auth project via the Admin API. The project's sync trigger then
 * inserts the matching `public.users` row as READER. Returns the new auth
 * UID. `apps/admin` only; requires `AUTH_SUPABASE_SERVICE_ROLE_KEY`.
 */
export async function createStaffAuthUser(params: {
  email: string;
  password: string;
  name: string;
}): Promise<{ userId: string }> {
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase.auth.admin.createUser({
    email: params.email,
    password: params.password,
    email_confirm: true,
    user_metadata: { name: params.name },
  });
  if (error || !data.user) {
    throw new Error(error?.message ?? "Could not create the staff account.");
  }
  return { userId: data.user.id };
}
