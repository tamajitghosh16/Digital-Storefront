import { expect, test } from "@playwright/test";

// Signed-out behaviour of the customer auth pages. Everything here fails
// validation in the browser before Supabase is called, so no test account
// is needed.

test("account pages send a signed-out visitor to sign in @smoke", async ({ page }) => {
  await page.goto("/account/library");

  await expect(page).toHaveURL(/\/sign-in\?next=%2Faccount%2Flibrary/);
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});

test("sign-in explains an empty submission", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();

  await expect(page.getByText("Please enter your email.")).toBeVisible();
  await expect(page.getByText("Please enter your password.")).toBeVisible();
});

test("sign-up refuses mismatched passwords", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Test Reader");
  await page.getByLabel("Email").fill("reader@example.test");
  await page.getByLabel("Phone").fill("+91 98765 43210");
  await page.getByLabel("Create a password").fill("Reader@2026");
  await page.getByLabel("Confirm password").fill("Reader@2027");
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page.getByText("The two passwords don't match.")).toBeVisible();
});

test("sign-in links through to sign-up", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("link", { name: "Create an account" }).click();

  await expect(page).toHaveURL(/\/sign-up/);
});
