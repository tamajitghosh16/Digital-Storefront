import "server-only";
import { redirect } from "next/navigation";
import { getCurrentStaff, type StaffAccount } from "@repo/auth/server";
import { ADMIN_ROLES } from "@repo/auth/roles";
import type { Role } from "@repo/database";

/**
 * Page-level guard for every back-office page that reads data. proxy.ts
 * already redirects anyone without a staff session, but pages
 * shouldn't depend on a matcher regex being right forever — this re-checks
 * the same thing in the render itself (docs/security-roadmap.md, M8).
 */
export async function requireStaffPage(allowed: Role[] = ADMIN_ROLES): Promise<StaffAccount> {
  const staff = await getCurrentStaff();
  if (!staff) redirect("/sign-in");
  if (!allowed.includes(staff.role)) redirect("/unauthorized");
  return staff;
}
