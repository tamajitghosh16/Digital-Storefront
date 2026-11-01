import { expect, test } from "@playwright/test";

// @smoke: the quick "is the storefront up?" pass — run after every deploy
// with `npm run test:smoke --workspace=web`. Keep this file fast and free of
// test data: it must pass against an empty catalogue.

const PUBLIC_PAGES = [
  "/",
  "/educational-material/books",
  "/services",
  "/self-publishing",
  "/contact",
  "/terms",
  "/privacy-policy",
  "/refund-policy",
  "/shipping-policy",
];

for (const path of PUBLIC_PAGES) {
  test(`${path} loads @smoke`, async ({ page }) => {
    const response = await page.goto(path);

    expect(response?.status(), `status of ${path}`).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
}

test("an unknown page shows the 404 page @smoke", async ({ page }) => {
  await page.goto("/this-page-does-not-exist");

  // Not a status check: app/loading.tsx makes every page stream, and once a
  // streamed response has started Next can't change its 200 to a 404. It
  // marks the page noindex instead, which is what keeps it out of search.
  await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();
  await expect(page.locator('meta[name="robots"][content~="noindex"]').first()).toBeAttached();
});

test("robots.txt and the sitemap are served @smoke", async ({ request }) => {
  const robots = await request.get("/robots.txt");
  expect(robots.ok()).toBe(true);
  // Outside production (local, Vercel previews) robots.ts blocks everything.
  const productionSite = process.env.VERCEL_ENV === "production" || process.env.E2E_PRODUCTION === "1";
  expect(await robots.text()).toContain(productionSite ? "Sitemap:" : "Disallow: /");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBe(true);
  expect(await sitemap.text()).toContain("<urlset");
});
