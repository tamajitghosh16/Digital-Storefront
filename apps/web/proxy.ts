import { NextResponse, type NextRequest } from "next/server";
import { createAuthMiddleware } from "@repo/auth/middleware";
import { buildContentSecurityPolicy, createNonce, cspHeaderName, originOf } from "@repo/security/headers";

/**
 * Runs on every page request:
 *  1. mints a per-request nonce and sets a Content-Security-Policy (see
 *     packages/security/src/headers.ts) — Next.js reads the nonce back off
 *     the request header and stamps it on its own scripts; the root layout
 *     reads `x-nonce` for next-themes' inline script;
 *  2. on the signed-in areas only, refreshes the Supabase session and
 *     redirects signed-out visitors to /sign-in. Per-page role checks (e.g.
 *     the author dashboard) happen in the page/layout itself (Section 3.3).
 */
const PROTECTED_PATHS = [/^\/account(\/|$)/, /^\/self-publishing\/wizard(\/|$)/];

const auth = createAuthMiddleware();

const supabaseOrigin = originOf(process.env.NEXT_PUBLIC_SUPABASE_URL);

function contentSecurityPolicy(nonce: string): string {
  return buildContentSecurityPolicy({
    nonce,
    development: process.env.NODE_ENV === "development",
    // Razorpay Checkout: its script, its iframes, and its telemetry/API calls.
    scriptSrc: ["https://checkout.razorpay.com"],
    frameSrc: ["https://api.razorpay.com", "https://checkout.razorpay.com"],
    connectSrc: [
      supabaseOrigin,
      supabaseOrigin?.replace(/^https:/, "wss:"),
      "https://api.razorpay.com",
      "https://lumberjack.razorpay.com",
    ].filter(Boolean) as string[],
    // Covers and banner art: the Supabase `images` bucket, Vercel Blob, and
    // any https URL an editor pastes into the back office.
    imgSrc: ["https:"],
  });
}

export async function proxy(request: NextRequest) {
  const nonce = createNonce();
  const csp = contentSecurityPolicy(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  // Next.js extracts the nonce from the *request's* CSP header.
  requestHeaders.set("Content-Security-Policy", csp);

  const response = PROTECTED_PATHS.some((pattern) => pattern.test(request.nextUrl.pathname))
    ? await auth(request, { requestHeaders })
    : NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set(cspHeaderName(), csp);
  return response;
}

export const config = {
  matcher: [
    {
      // Pages only: skip static assets, image files, and API routes (JSON
      // responses and webhooks need no CSP and shouldn't pay for a nonce).
      source: "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|avif|svg|ico|txt|xml|woff2?)$).*)",
      // Prefetches are rendered with the nonce of the navigation that uses them.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
