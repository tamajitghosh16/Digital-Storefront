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
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
