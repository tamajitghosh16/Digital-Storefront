import { expect, test as setup } from "@playwright/test";
import { CUSTOMER_STATE, customerCredentials } from "./support/auth";

// Signs the test customer in once and saves the session for every
// `*.auth.spec.ts`, so those tests start already signed in.
setup("sign in as the test customer", async ({ page }) => {
  const { email, password } = customerCredentials();

  await page.goto("/sign-in?next=/account/library");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).toHaveURL(/\/account\/library/);
  await page.context().storageState({ path: CUSTOMER_STATE });
});
