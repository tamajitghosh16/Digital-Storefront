import path from "node:path";
import { fileURLToPath } from "node:url";

// The saved browser session for the signed-in project. Lives under
// testing/.auth/, which is gitignored: it holds a live session cookie.
export const STAFF_STATE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.auth/staff.json");

/**
 * A test staff account in the admin auth project. Use a dedicated account
 * with the lowest role the tests need (SUPPORT for read-only checks) —
 * never the Owner's own login.
 */
export function staffCredentials() {
  return { email: process.env.E2E_STAFF_EMAIL ?? "", password: process.env.E2E_STAFF_PASSWORD ?? "" };
}

export function hasStaffCredentials(): boolean {
  const { email, password } = staffCredentials();
  return email !== "" && password !== "";
}
