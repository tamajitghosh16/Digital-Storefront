import { createAuthMiddleware } from "@repo/auth/middleware";
import { ADMIN_ROLES } from "@repo/auth/roles";

// Whole app is staff-only — Technical Design Document, Section 2.2:
// "Publisher (Owner) & Staff only, on a separate subdomain ... with its
// own auth check". Individual pages layer OWNER-only checks on top
// (e.g. app/settings/roles) via assertRole() in their Server Actions.
export const proxy = createAuthMiddleware({ allowedRoles: ADMIN_ROLES, signInPath: "/sign-in" });

// `join` is the hashed staff sign-up route (app/join/[token]) — reachable
// with no session, since the person redeeming an invite has no account yet.
export const config = {
  matcher: ["/((?!sign-in|forgot-password|reset-password|unauthorized|join|_next/static|_next/image|favicon.ico).*)"],
};
