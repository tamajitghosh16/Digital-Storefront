import type { NextConfig } from "next";
import { staticSecurityHeaders } from "@repo/security/headers";

const nextConfig: NextConfig = {
  // apps/web and apps/admin both import from shared workspace packages —
  // transpile them since they ship untranspiled TS.
  transpilePackages: [
    "@repo/ui",
    "@repo/auth",
    "@repo/database",
    "@repo/payments",
    "@repo/storage",
    "@repo/jobs",
    "@repo/security",
  ],
  // Don't advertise the framework.
  poweredByHeader: false,
  // Security headers on every response, static assets included. The
  // per-request CSP is set in proxy.ts (it needs a fresh nonce each time).
  async headers() {
    return [
      { source: "/:path*", headers: staticSecurityHeaders({ production: process.env.NODE_ENV === "production" }) },
      // Supabase auth links land here carrying one-time codes in the URL.
      { source: "/sign-in", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/account/:path*", headers: [{ key: "Cache-Control", value: "private, no-store" }] },
    ];
  },
  images: {
    // Covers are uploaded at full camera/scan size (a median ~400 KB, some
    // over 2 MB), so every <Image> goes through the built-in /_next/image
    // optimizer: resized to the rendered width, re-encoded as WebP, cached on
    // disk / at the CDN. A grid tile then costs ~20–40 KB instead of the
    // original. (Supabase's own resize endpoint is a paid feature that 403s
    // on this project, so it isn't an option.)
    formats: ["image/webp"],
    // Uploaded object names are unique (`<uuid>-<name>`), so an optimized
    // copy never goes stale — keep it for a month.
    minimumCacheTTL: 60 * 60 * 24 * 31,
    // Next 16's SSRF guard refuses an upstream that resolves to a private
    // address — which is what *.supabase.co looks like on a DNS64/NAT64
    // network (64:ff9b::/96). Relaxed in development only, where the
    // optimizer runs on the developer's own machine; production keeps it.
    dangerouslyAllowLocalIP: process.env.NODE_ENV === "development",
    remotePatterns: [
      // Customer manuscripts / staged uploads on Vercel Blob.
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Book covers and banner art: admin's /api/uploads writes these
      // straight to the public `images` bucket in Supabase Storage
      // (see apps/admin/CLAUDE.md).
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/**" },
    ],
  },
  // The catalogue moved under the department IA and the separate e-book
  // listing was folded in. Keep every old link and bookmark working.
  async redirects() {
    return [
      { source: "/books", destination: "/educational-material/books", permanent: true },
      { source: "/ebooks", destination: "/educational-material/books", permanent: true },
      { source: "/books/:slug", destination: "/educational-material/books/:slug", permanent: true },
      { source: "/ebooks/:slug", destination: "/educational-material/books/:slug", permanent: true },
      // The three other Educational Materials lines moved under the same
      // department segment as books.
      { source: "/educational-charts", destination: "/educational-material/educational-charts", permanent: true },
      {
        source: "/worksheets-activity-puzzles",
        destination: "/educational-material/worksheets-activity-puzzles",
        permanent: true,
      },
      {
        source: "/teaching-learning-materials",
        destination: "/educational-material/teaching-learning-materials",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
