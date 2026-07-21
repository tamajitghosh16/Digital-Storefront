import { createAuthMiddleware } from "@repo/auth/middleware";

// Storefront: any signed-in role may pass; per-page role checks (e.g. the
// author dashboard) happen in the page/layout itself (Section 3.3).
export const middleware = createAuthMiddleware();

export const config = {
  matcher: ["/account/:path*", "/self-publishing/wizard/:path*"],
};
