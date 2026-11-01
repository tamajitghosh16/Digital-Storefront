import { expect, test } from "@playwright/test";

// Runs in the "signed-in" project only (see playwright.config.ts), already
// signed in as the test staff member. Read-only on purpose: these run
// against the shared storefront database.

test("the dashboard opens for signed-in staff", async ({ page }) => {
  await page.goto("/");

  await expect(page).not.toHaveURL(/\/(sign-in|unauthorized)/);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});

test("the Books catalogue lists without errors", async ({ page }) => {
  const response = await page.goto("/educational-material/books");

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
});
