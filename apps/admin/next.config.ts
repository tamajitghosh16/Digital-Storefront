import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@repo/ui", "@repo/auth", "@repo/database", "@repo/payments", "@repo/storage", "@repo/jobs"],
};

export default nextConfig;
