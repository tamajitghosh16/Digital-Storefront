import { expect, test as setup } from "@playwright/test";
import { STAFF_STATE, staffCredentials } from "./support/auth";

// Signs the test staff member in once and saves the session for every
// `*.auth.spec.ts`, so those tests start already signed in.
setup("sign in as the test staff member", async ({ page }) => {
  const { email, password } = staffCredentials();

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page).not.toHaveURL(/\/sign-in/);
  await page.context().storageState({ path: STAFF_STATE });
});
