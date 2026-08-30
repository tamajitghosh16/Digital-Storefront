import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Role } from "@repo/database";

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
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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

    // Role check happens against the `users` table (public schema), synced
    // from auth.users — see packages/database/prisma/sql/sync_user.sql.
    // Fetched here via a lightweight REST call rather than Prisma, since
    // this factory is shared code and Prisma's client isn't meant to run
    // outside a Node.js server process.
    if (options?.allowedRoles?.length) {
      const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
      if (!profile || !options.allowedRoles.includes(profile.role as Role)) {
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    return response;
  };
}
