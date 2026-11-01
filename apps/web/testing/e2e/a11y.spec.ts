import { test } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./support/a11y";

// @a11y: automated WCAG 2.1 AA checks (axe-core) on the pages every shopper
// meets. Automated checks find roughly a third of real problems — keyboard
// and screen-reader passes by a person are still needed before launch.

const PAGES = [
  "/",
  "/educational-material/books",
  "/services",
  "/self-publishing",
  "/contact",
  "/cart",
  "/sign-in",
  "/sign-up",
  "/privacy-policy",
  "/this-page-does-not-exist",
];

test.describe("@a11y", () => {
  for (const path of PAGES) {
    test(`${path} has no serious accessibility violations`, async ({ page }, testInfo) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      await expectNoSeriousA11yViolations(page, testInfo);
    });
  }

  for (const path of ["/", "/sign-in"]) {
    test(`${path} is usable in dark mode`, async ({ page }, testInfo) => {
      await page.emulateMedia({ colorScheme: "dark" });
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      await expectNoSeriousA11yViolations(page, testInfo);
    });
  }

  test("the sign-in form can be completed by keyboard alone", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").focus();

    await page.keyboard.type("reader@example.test");
    await page.keyboard.press("Tab");
    await page.keyboard.type("x");
    await page.keyboard.press("Tab");

    await test.expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeFocused();
  });
});
