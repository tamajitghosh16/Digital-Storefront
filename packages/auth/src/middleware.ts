import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Role } from "@repo/database";
import { authSupabasePublishableKey, authSupabaseUrl } from "./env";

/**
 * Shared middleware factory used by both apps' middleware.ts. Refreshes the
 * Supabase session on every request and optionally redirects if the caller's
 * role isn't in `allowedRoles` (used by apps/admin to lock the whole app to
 * SUPPORT | EDITOR | OWNER — see apps/admin/middleware.ts).
 */
export function createAuthMiddleware(options?: { allowedRoles?: Role[]; signInPath?: string }) {
  const signInPath = options?.signInPath ?? "/sign-in";

  return async function middleware(request: NextRequest) {
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
      authSupabaseUrl(),
      authSupabasePublishableKey(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = signInPath;
      url.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }

    // Role check happens against the `users` table (public schema) in *this
    // app's auth project*, synced from that project's auth.users by a trigger
    // — see packages/database/prisma/sql/sync_user.sql (storefront project)
    // and sync_staff.sql (the admin-only project). Fetched here via a
    // lightweight REST call rather than Prisma, since this factory is shared
    // code and Prisma's client isn't meant to run outside a Node.js server
    // process (and, for apps/admin, points at the storefront DB, not the
    // auth project).
    if (options?.allowedRoles?.length) {
      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
      if (!profile || !options.allowedRoles.includes(profile.role as Role)) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    return response;
  };
}
