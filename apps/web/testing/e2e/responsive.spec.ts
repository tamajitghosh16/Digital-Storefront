import { expect, test, type Page } from "@playwright/test";

// @responsive: the storefront at the widths people actually use, from a
// small phone to a wide desktop. Runs in the desktop project (resizing the
// viewport per test) and again on real device profiles — iPhone, iPad,
// Firefox, Safari — from playwright.cross-browser.config.ts.

const WIDTHS = [
  { name: "small phone", width: 320, height: 640 },
  { name: "phone", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1280, height: 800 },
  { name: "wide desktop", width: 1920, height: 1080 },
];

const PAGES = ["/", "/educational-material/books", "/cart", "/sign-up", "/self-publishing"];

/**
 * Elements that stick out past the viewport — the cause of sideways scrolling
 * on phones. Anything inside a clipping container (the promo marquee, a
 * scrollable table) is deliberate and doesn't count.
 */
async function overflowingElements(page: Page) {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= limit) return [];
    const clipped = (el: Element) => {
      for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        if (getComputedStyle(a).overflowX !== "visible") return true;
      }
      return false;
    };
    return [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => el.getBoundingClientRect().right > limit + 1 && !clipped(el) && getComputedStyle(el).position !== "fixed")
      .slice(0, 3)
      .map((el) => `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}">`);
  });
}

// Known layout bugs, by viewport width: test.fail() keeps CI green while the
// bug stands and turns red ("expected to fail, but passed") once it's fixed —
// then delete the entry. Empty is the goal.
const KNOWN_OVERFLOW: Record<number, string> = {};

test.describe("@responsive", () => {
  for (const size of WIDTHS) {
    test.describe(`${size.name} (${size.width}px)`, () => {
      test.use({ viewport: { width: size.width, height: size.height } });

      for (const path of PAGES) {
        test(`${path} doesn't scroll sideways`, async ({ page }) => {
          test.fail(size.width in KNOWN_OVERFLOW, KNOWN_OVERFLOW[size.width]);
          await page.goto(path);
          await page.waitForLoadState("networkidle");

          expect(await overflowingElements(page)).toEqual([]);
        });
      }

      test("navigation fits the screen", async ({ page }) => {
        await page.goto("/");
        const menuButton = page.getByRole("button", { name: "Open menu" });

        // The department bar collapses into the menu below 900px.
        if (size.width < 900) {
          await expect(menuButton).toBeVisible();
        } else {
          await expect(menuButton).toBeHidden();
          await expect(page.getByRole("navigation").getByRole("link", { name: "Books", exact: true }).first()).toBeVisible();
        }
      });
    });
  }

  test("tap targets on the phone menu are at least 44px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const box = await page.getByRole("button", { name: "Open menu" }).boundingBox();

    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
  });
});
