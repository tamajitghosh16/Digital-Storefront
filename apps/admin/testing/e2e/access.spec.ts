import { expect, test } from "@playwright/test";

// Signed-out access rules from proxy.ts: every route — API routes included —
// needs a staff session, except the anchored PUBLIC_PATHS.

test("the staff sign-in page loads @smoke", async ({ page }) => {
  const response = await page.goto("/sign-in");

  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Staff sign in" })).toBeVisible();
  // Accounts are Owner-invited only; there must be no way to sign up here.
  await expect(page.getByRole("link", { name: /sign up|create an account/i })).toHaveCount(0);
});

for (const path of ["/", "/educational-material/books", "/orders", "/settings/roles"]) {
  test(`${path} sends a signed-out visitor to sign in @smoke`, async ({ page }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/sign-in\?next=/);
  });
}

test("the public paths are anchored: /joinx is not /join @smoke", async ({ page }) => {
  await page.goto("/joinx");

  await expect(page).toHaveURL(/\/sign-in\?next=%2Fjoinx/);
});

test("a bogus invite link is refused, not signed up", async ({ page }) => {
  await page.goto("/join/not-a-real-token");

  await expect(page.getByRole("heading", { name: "This link isn’t valid" })).toBeVisible();
});

test("forgot-password is reachable while signed out", async ({ page }) => {
  await page.goto("/forgot-password");

  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible();
});

test("the upload API refuses a signed-out caller @smoke", async ({ request }) => {
  const response = await request.post("/api/uploads", { maxRedirects: 0, multipart: { file: "x" } });

  // The proxy redirects to sign-in (or the route answers 401/403) — anything
  // but a successful upload.
  expect([301, 302, 303, 307, 308, 401, 403]).toContain(response.status());
});

test("pages are served with a nonce Content-Security-Policy @smoke", async ({ request }) => {
  const response = await request.get("/sign-in");
  const csp = response.headers()["content-security-policy"] ?? response.headers()["content-security-policy-report-only"];

  expect(csp).toMatch(/script-src[^;]*'nonce-/);
  expect(response.headers()["x-frame-options"] ?? csp).toMatch(/DENY|frame-ancestors 'none'/i);
});
