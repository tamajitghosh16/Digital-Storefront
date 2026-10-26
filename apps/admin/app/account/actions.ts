"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { authSupabasePublishableKey, authSupabaseUrl } from "@repo/auth/env";
import { requireStaff } from "@repo/auth/server";
import { ADMIN_ROLES } from "@repo/auth/roles";
import { rateLimit } from "@repo/security/rate-limit";
import { securityEvent } from "@repo/security/log";

/**
 * Confirms the signed-in staff member's *current* password before the
 * browser changes it. Done server-side with a throwaway, non-persisted
 * Supabase client so the check never replaces the browser's own session.
 * Rate-limited so it can't be used to brute-force the password of an
 * unattended, signed-in session.
 */
export async function verifyCurrentPassword(password: string): Promise<{ ok: boolean; error?: string }> {
  const staff = await requireStaff(ADMIN_ROLES);

  if (!(await rateLimit({ name: "staff.password_check", limit: 5, windowSeconds: 900 }, staff.id)).ok) {
    return { ok: false, error: "Too many attempts. Please wait 15 minutes and try again." };
  }
  if (typeof password !== "string" || password.length === 0 || password.length > 200) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const probe = createSupabaseClient(authSupabaseUrl(), authSupabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await probe.auth.signInWithPassword({ email: staff.email, password });
  if (error) {
    securityEvent("auth.forbidden", { userId: staff.id, reason: "wrong current password on password change" });
    return { ok: false, error: "Current password is incorrect." };
  }
  // Drop the throwaway session locally; it was never stored anywhere.
  await probe.auth.signOut({ scope: "local" }).catch(() => {});
  return { ok: true };
}
