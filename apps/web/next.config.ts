import type { NextConfig } from "next";

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
  ],
  images: {
    // Every <Image> goes through this loader instead of the built-in
    // /_next/image optimizer — see lib/supabase-image-loader.ts for why
    // (Next 16's SSRF guard rejects Supabase behind DNS64/NAT64).
    loader: "custom",
    loaderFile: "./lib/supabase-image-loader.ts",
    // Kept as a fallback: only consulted if the custom loader is removed
    // and images fall back to /_next/image.
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
