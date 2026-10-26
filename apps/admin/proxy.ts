import { NextResponse, type NextRequest } from "next/server";
import { createAuthMiddleware } from "@repo/auth/middleware";
import { ADMIN_ROLES } from "@repo/auth/roles";
import { buildContentSecurityPolicy, createNonce, cspHeaderName, originOf } from "@repo/security/headers";

/**
 * Whole app is staff-only — Technical Design Document, Section 2.2:
 * "Publisher (Owner) & Staff only, on a separate subdomain ... with its
 * own auth check". Every page request:
 *  1. gets a per-request nonce CSP (packages/security/src/headers.ts);
 *  2. unless it's one of the PUBLIC_PATHS, must be signed in to the
 *     dedicated admin auth project and hold a staff role.
 *
 * Individual Server Actions re-check with getCurrentStaff()/assertRole();
 * this gate is a UX redirect, not the security boundary.
 */

// Anchored: `/join/<token>` is public, `/joinx` is not.
const PUBLIC_PATHS = /^\/(?:sign-in|forgot-password|reset-password|unauthorized|join)(?:\/|$)/;

const auth = createAuthMiddleware({
  allowedRoles: ADMIN_ROLES,
  signInPath: "/sign-in",
  requireDedicatedAuthProject: true,
});

const authOrigin = originOf(process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL);
const storefrontOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);

function contentSecurityPolicy(nonce: string): string {
  return buildContentSecurityPolicy({
    nonce,
    development: process.env.NODE_ENV === "development",
    // Browser → Supabase: auth (admin project) and the signed e-book upload
    // PUT (storefront project's Storage).
    connectSrc: [authOrigin, storefrontOrigin].filter(Boolean) as string[],
    // Previews of covers/banners, which may be any https URL an editor pastes.
    imgSrc: ["https:"],
  });
}

export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = PUBLIC_PATHS.test(request.nextUrl.pathname)
    ? NextResponse.next({ request: { headers: requestHeaders } })
    : await auth(request, { requestHeaders });

  response.headers.set(cspHeaderName(), csp);
  return response;
}

export const config = {
  // Everything except static assets. API routes are included on purpose:
  // the upload endpoints get the same session/role gate as pages (and
  // re-check it themselves).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|txt|woff2?)$).*)"],
};
