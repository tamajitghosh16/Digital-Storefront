/**
 * Staff password policy. A back-office account can change prices, publish
 * content and (as Owner) grant roles, so it gets a longer minimum than a
 * customer account. Keep the admin auth project's own setting (Auth →
 * Providers → Email → Minimum password length, plus "Prevent use of leaked
 * passwords") at least this strict — the client-side check is UX, the
 * project setting is what's enforced.
 */
export const STAFF_PASSWORD_MIN = 12;
/** bcrypt, which Supabase Auth uses, ignores bytes past 72. */
export const STAFF_PASSWORD_MAX = 72;
