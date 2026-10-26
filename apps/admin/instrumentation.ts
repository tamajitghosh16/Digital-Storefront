import { checkEnvironment, noPublicSecrets } from "@repo/security/env";

/**
 * Runs once when the server starts. In production the back office refuses
 * to boot unless it authenticates against its OWN Supabase project —
 * otherwise `packages/auth` would fall back to the storefront project, where
 * anyone can sign up (docs/security-roadmap.md, H2). In development these
 * only warn.
 */
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  checkEnvironment("apps/admin", {
    rules: [
      { name: "NEXT_PUBLIC_AUTH_SUPABASE_URL", reason: "staff must authenticate against the dedicated admin auth project" },
      { name: "NEXT_PUBLIC_AUTH_SUPABASE_PUBLISHABLE_KEY", reason: "staff must authenticate against the dedicated admin auth project" },
      { name: "AUTH_SUPABASE_SERVICE_ROLE_KEY", reason: "Owner staff management (invite, role change, removal)" },
      { name: "NEXT_PUBLIC_ADMIN_URL", reason: "staff invite links must never be built from the request's Host header" },
      { name: "DATABASE_URL", reason: "all business data" },
    ],
    invariants: [
      noPublicSecrets,
      () => {
        const auth = process.env.NEXT_PUBLIC_AUTH_SUPABASE_URL?.replace(/\/$/, "");
        const storefront = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
        return auth && storefront && auth === storefront
          ? "NEXT_PUBLIC_AUTH_SUPABASE_URL points at the storefront project — the back office must use its own auth project"
          : null;
      },
    ],
  });
}
