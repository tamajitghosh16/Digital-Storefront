import type { MetadataRoute } from "next";
import { deploymentEnv } from "@repo/security/env";
import { siteUrl } from "@/lib/site-url";

// Everything a crawler has no business indexing: per-user pages, the
// checkout flow, auth screens and the API. These are not access controls —
// /account and the wizard are protected in proxy.ts and their layouts.
const PRIVATE_PATHS = [
  "/account",
  "/cart",
  "/checkout",
  "/payment",
  "/self-publishing/wizard",
  "/sign-in",
  "/sign-up",
  "/unauthorized",
  "/api/",
];

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  // Preview and local builds must never be indexed alongside production.
  const deployment = deploymentEnv();
  const isProduction = deployment ? deployment === "production" : process.env.NODE_ENV === "production";

  if (!isProduction) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
