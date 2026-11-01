import { expect, test } from "@playwright/test";

// Runs in the "signed-in" project only (see playwright.config.ts), already
// signed in as the test customer.

test("the library is reachable once signed in", async ({ page }) => {
  await page.goto("/account/library");

  await expect(page).toHaveURL(/\/account\/library/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});
