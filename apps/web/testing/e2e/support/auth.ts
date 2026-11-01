import path from "node:path";
import { fileURLToPath } from "node:url";

// The saved browser session for the signed-in project. Lives under
// testing/.auth/, which is gitignored: it holds a live session cookie.
export const CUSTOMER_STATE = path.join(path.dirname(fileURLToPath(import.meta.url)), "../../.auth/customer.json");

/**
 * A test customer in the storefront Supabase project. Never a real
 * customer's account — create a dedicated one in the test project.
 */
export function customerCredentials() {
  return { email: process.env.E2E_CUSTOMER_EMAIL ?? "", password: process.env.E2E_CUSTOMER_PASSWORD ?? "" };
}

export function hasCustomerCredentials(): boolean {
  const { email, password } = customerCredentials();
  return email !== "" && password !== "";
}
