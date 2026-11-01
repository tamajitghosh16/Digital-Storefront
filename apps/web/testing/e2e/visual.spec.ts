import { expect, test } from "@playwright/test";

// @visual: pixel comparisons against committed baselines
// (e2e/__screenshots__/<platform>/). Only the `visual` project runs these.
//
// Only CMS-independent screens, and only their <main>: the header, footer and
// homepage are admin-edited copy, so they'd "regress" every time the
// Publisher saves. After an intended change, refresh the baselines with
// `npm run test:visual:update --workspace=web` and review the diff.

// The dev server's floating Next.js badge (absent from production builds).
// It renders in a shadow root a screenshot mask can't reach, so hide it.
const HIDE_DEV_OVERLAY = "nextjs-portal { display: none !important; }";

const SCREENS = [
  { name: "sign-in", path: "/sign-in" },
  { name: "sign-up", path: "/sign-up" },
  { name: "empty-cart", path: "/cart" },
  { name: "not-found", path: "/this-page-does-not-exist" },
];

test.describe("@visual", () => {
  for (const screen of SCREENS) {
    for (const colorScheme of ["light", "dark"] as const) {
      test(`${screen.name} (${colorScheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme, reducedMotion: "reduce" });
        await page.goto(screen.path);
        await page.waitForLoadState("networkidle");
        await page.evaluate(() => document.fonts.ready);
        await page.addStyleTag({ content: HIDE_DEV_OVERLAY });

        await expect(page.locator("main")).toHaveScreenshot(`${screen.name}-${colorScheme}.png`);
      });
    }
  }

  test("sign-up shows its validation state consistently", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.addStyleTag({ content: HIDE_DEV_OVERLAY });

    await expect(page.locator("main")).toHaveScreenshot("sign-up-errors.png");
  });
});
