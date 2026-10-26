import type { NextConfig } from "next";
import { NO_REFERRER_HEADERS, staticSecurityHeaders } from "@repo/security/headers";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/auth", "@repo/database", "@repo/storage", "@repo/security"],
  poweredByHeader: false,
  // Security headers on every response (the per-request CSP is set in
  // proxy.ts). Nothing in the back office may be cached by a browser or
  // shared proxy, or indexed.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: staticSecurityHeaders({ production: process.env.NODE_ENV === "production", noIndex: true }),
      },
      // Pages and API responses only — hashed static chunks keep their long cache.
      { source: "/((?!_next/static|_next/image).*)", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
      // URLs that carry a secret (invite token, recovery code) never leak it via Referer.
      { source: "/join/:path*", headers: NO_REFERRER_HEADERS },
      { source: "/reset-password", headers: NO_REFERRER_HEADERS },
    ];
  },
};

export default nextConfig;
