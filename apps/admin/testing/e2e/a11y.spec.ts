import { test } from "@playwright/test";
import { expectNoSeriousA11yViolations } from "./support/a11y";

// @a11y: WCAG 2.1 AA checks (axe-core) on the screens reachable signed out.
// The signed-in screens are covered by dashboard.auth.spec.ts once a test
// staff account is configured.

const PAGES = ["/sign-in", "/forgot-password", "/unauthorized", "/join/not-a-real-token"];

test.describe("@a11y", () => {
  for (const path of PAGES) {
    test(`${path} has no serious accessibility violations`, async ({ page }, testInfo) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");

      await expectNoSeriousA11yViolations(page, testInfo);
    });
  }

  test("staff sign-in is usable in dark mode", async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/sign-in");

    await expectNoSeriousA11yViolations(page, testInfo);
  });
});
