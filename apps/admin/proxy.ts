import { createAuthMiddleware } from "@repo/auth/middleware";
import { ADMIN_ROLES } from "@repo/auth/roles";

// Whole app is staff-only — Technical Design Document, Section 2.2:
// "Publisher (Owner) & Staff only, on a separate subdomain ... with its
// own auth check". Individual pages layer OWNER-only checks on top
// (e.g. app/settings/roles) via assertRole() in their Server Actions.
export const proxy = createAuthMiddleware({ allowedRoles: ADMIN_ROLES, signInPath: "/sign-in" });

export const config = {
  matcher: ["/((?!sign-in|forgot-password|reset-password|unauthorized|_next/static|_next/image|favicon.ico).*)"],
};
