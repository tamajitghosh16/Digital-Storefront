import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { Role } from "@repo/database";
import { securityEvent } from "@repo/security/log";
import { authSupabasePublishableKey, authSupabaseUrl, isDedicatedAuthProjectConfigured } from "./env";

export interface AuthMiddlewareOptions {
  /** Roles allowed through. Omit to allow any signed-in user. */
  allowedRoles?: Role[];
  signInPath?: string;
  /**
   * Refuse to serve (503) in production unless this app authenticates
   * against its own dedicated Supabase project. `apps/admin` sets this so a
   * missing env var can never point the back office at the public
   * storefront project, where anyone can sign up.
   */
  requireDedicatedAuthProject?: boolean;
}

export interface AuthMiddlewareInit {
  /**
   * Request headers to forward to the app (e.g. with the per-request CSP
   * nonce added by the caller's proxy). Defaults to the incoming headers.
   */
  requestHeaders?: Headers;
}

/**
 * Shared middleware factory used by both apps' proxy.ts. Refreshes the
 * Supabase session on every request, redirects signed-out users to sign in,
 * and optionally enforces a role allowlist (used by apps/admin to lock the
 * whole app to SUPPORT | EDITOR | OWNER).
 *
 * This is a UX gate, not the security boundary: every Server Action and
 * Route Handler re-checks with `getCurrentStaff()` / `assertRole()`.
 */
export function createAuthMiddleware(options?: AuthMiddlewareOptions) {
  const signInPath = options?.signInPath ?? "/sign-in";

  return async function middleware(request: NextRequest, init?: AuthMiddlewareInit) {
    const forward = () => NextResponse.next({ request: { headers: init?.requestHeaders ?? request.headers } });

    if (
      options?.requireDedicatedAuthProject &&
      process.env.NODE_ENV === "production" &&
      !isDedicatedAuthProjectConfigured()
    ) {
      securityEvent("auth.misconfigured", { reason: "dedicated auth project not configured" });
      return new NextResponse("Service unavailable: authentication is not configured.", { status: 503 });
    }

    let response = forward();

    const supabase = createServerClient(authSupabaseUrl(), authSupabasePublishableKey(), {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = forward();
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    });

    // Verified locally against the project's cached JWKS (ES256) rather than
    // an HTTP round trip to Supabase Auth per request — see
    // getSessionIdentity() in ./server.ts for the trade-off. Refreshes an
    // expiring session first, which lands in setAll() above.
    const { data } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;

    if (!userId) {
      const url = request.nextUrl.clone();
      url.pathname = signInPath;
      url.search = "";
      // Only ever a same-origin path — the sign-in page re-validates it too.
      url.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
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
      const { data: profile } = await supabase.from("users").select("role").eq("id", userId).single();
      if (!profile || !options.allowedRoles.includes(profile.role as Role)) {
        securityEvent("auth.forbidden", { userId, path: request.nextUrl.pathname, role: profile?.role ?? null });
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    return response;
  };
}
