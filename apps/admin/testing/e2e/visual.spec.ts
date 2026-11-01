import { expect, test } from "@playwright/test";

// @visual: pixel comparisons of the signed-out screens against committed
// baselines (e2e/__screenshots__/<platform>/). Only the `visual` project runs
// these. Refresh after an intended change with
// `npm run test:visual:update --workspace=admin` and review the diff.

// The dev server's floating Next.js badge (absent from production builds).
// It renders in a shadow root a screenshot mask can't reach, so hide it.
const HIDE_DEV_OVERLAY = "nextjs-portal { display: none !important; }";

const SCREENS = [
  { name: "sign-in", path: "/sign-in" },
  { name: "forgot-password", path: "/forgot-password" },
  { name: "invalid-invite", path: "/join/not-a-real-token" },
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

        await expect(page).toHaveScreenshot(`${screen.name}-${colorScheme}.png`, { fullPage: true });
      });
    }
  }
});
