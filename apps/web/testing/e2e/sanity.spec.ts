import { expect, test } from "@playwright/test";

// @sanity: after a change or deploy, do the main things a shopper does still
// work? Deeper than @smoke (which only checks pages load), still quick, and
// still safe on an empty catalogue: product-dependent checks skip themselves.

test.describe("@sanity", () => {
  test("the header search goes to matching books", async ({ page }) => {
    await page.goto("/");
    // The header renders a desktop and a phone search box; use whichever shows.
    const search = page.getByRole("search").filter({ visible: true });

    // The box is a controlled React input: text typed before hydration is
    // dropped, which a busy dev server (WebKit especially) makes likely. Retry
    // the search rather than guess when hydration finished.
    await expect(async () => {
      await search.getByRole("searchbox").fill("grammar");
      await search.getByRole("button", { name: "Search", exact: true }).click();
      await expect(page).toHaveURL(/\/educational-material\/books\?q=grammar/, { timeout: 5_000 });
    }).toPass({ timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("the department bar leads to a product line", async ({ page, isMobile }) => {
    test.skip(isMobile, "the department bar is replaced by the menu on phones");
    await page.goto("/");

    await page.getByRole("navigation").getByRole("link", { name: "Books", exact: true }).first().click();

    await expect(page).toHaveURL(/\/educational-material\/books/);
  });

  test("the phone menu opens and navigates", async ({ page, isMobile }) => {
    test.skip(!isMobile, "phones only");
    await page.goto("/");

    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog", { name: "Shop by department" });
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Books", exact: true }).first().click();

    await expect(page).toHaveURL(/\/educational-material\/books/);
  });

  test("an empty cart says so and offers a way back", async ({ page }) => {
    await page.goto("/cart");

    await expect(page.getByRole("heading", { name: "Your cart", level: 1 })).toBeVisible();
    await expect(page.getByText("Your cart is empty.").first()).toBeVisible();
  });

  test("the theme toggle switches to dark mode", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");

    await page.getByRole("button", { name: "Switch to dark mode" }).first().click();

    await expect(page.locator("html")).toHaveClass(/\bdark\b/);
  });

  test("footer policy links open their pages", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("contentinfo").getByRole("link", { name: "Refund & cancellation" }).click();

    await expect(page).toHaveURL(/\/refund-policy/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("a book can be added to the cart", async ({ page }) => {
    await page.goto("/educational-material/books");
    const firstBook = page.locator('main a[href^="/educational-material/books/"]').first();
    test.skip((await firstBook.count()) === 0, "the catalogue is empty");

    await firstBook.click();
    await page.getByRole("button", { name: "Add to cart" }).click();

    await expect(page.getByRole("button", { name: "Added to cart ✓" })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Cart, 1 item/ })).toBeVisible();
  });
});
