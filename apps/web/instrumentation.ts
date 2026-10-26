import { checkEnvironment, noInngestDevMode, noPublicSecrets } from "@repo/security/env";

/**
 * Runs once when the server starts. In production, security-critical
 * misconfiguration stops the app from booting rather than failing open
 * later (see packages/security/src/env.ts); in development it only warns.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  checkEnvironment("apps/web", {
    rules: [
      { name: "NEXT_PUBLIC_SUPABASE_URL", reason: "customer authentication" },
      { name: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", reason: "customer authentication" },
      { name: "DATABASE_URL", reason: "all business data" },
    ],
    invariants: [
      noPublicSecrets,
      noInngestDevMode,
      () =>
        process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_WEBHOOK_SECRET
          ? "RAZORPAY_KEY_ID is set but RAZORPAY_WEBHOOK_SECRET is not — every webhook would be rejected and paid orders would stay PENDING"
          : null,
      () =>
        process.env.NODE_ENV === "production" &&
        process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_") &&
        process.env.VERCEL_ENV === "production"
          ? "Production deployment is using Razorpay TEST keys"
          : null,
    ],
  });
}
