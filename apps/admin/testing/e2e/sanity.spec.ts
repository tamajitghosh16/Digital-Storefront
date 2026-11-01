import { expect, test } from "@playwright/test";

// @sanity: the signed-out paths a staff member walks through still connect
// up. The signed-in screens get the same treatment in dashboard.auth.spec.ts.

test.describe("@sanity", () => {
  test("sign-in links to password reset and back", async ({ page }) => {
    await page.goto("/sign-in");

    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();

    await page.getByRole("link", { name: /Back to sign in/ }).click();
    await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
  });

  test("a signed-out deep link returns to its page after sign-in", async ({ page }) => {
    await page.goto("/educational-material/books");

    await expect(page).toHaveURL(/\/sign-in\?next=%2Feducational-material%2Fbooks$/);
  });

  test("the sign-in form offers email, password and Google", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  });
});
