import { expect, test } from "@playwright/test";

// @security: the storefront's attack surface, probed from outside the way an
// attacker would (docs/security-roadmap.md). No credentials needed. Pairs with
// the CI scanners: npm audit, gitleaks, CodeQL (security.yml) and the OWASP
// ZAP baseline scan after each deploy (post-deploy.yml).

// Dev mode needs 'unsafe-eval' for React's tooling; a production build must not.
const productionBuild = !!process.env.CI || !!process.env.E2E_WEB_URL;

test.describe("@security", () => {
  test("security headers are set on every page", async ({ request }) => {
    const headers = (await request.get("/")).headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["permissions-policy"]).toContain("camera=()");
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("the CSP forbids inline script, plugins, framing and base hijacking", async ({ request }) => {
    const headers = (await request.get("/")).headers();
    const csp = headers["content-security-policy"] ?? "";
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";

    expect(scriptSrc).toMatch(/'nonce-[^']+'/);
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    if (productionBuild) expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("each response gets a fresh CSP nonce", async ({ request }) => {
    const nonce = async () => (await request.get("/")).headers()["content-security-policy"]?.match(/'nonce-([^']+)'/)?.[1];

    expect(await nonce()).not.toBe(await nonce());
  });

  test("search input is never executed as markup", async ({ page }) => {
    const payload = `"><img src=x onerror="window.__xss=1"><script>window.__xss=1</script>`;
    page.on("dialog", (dialog) => {
      throw new Error(`Unexpected dialog: ${dialog.message()}`);
    });

    await page.goto(`/educational-material/books?q=${encodeURIComponent(payload)}`);

    await page.waitForLoadState("networkidle");
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  test("sign-in never carries an off-site `next` into its links", async ({ page }) => {
    await page.goto(`/sign-in?next=${encodeURIComponent("https://evil.example/phish")}`);

    const signUp = await page.getByRole("link", { name: "Create an account" }).getAttribute("href");
    expect(signUp).not.toContain("evil.example");
  });

  test("protected pages can't be reached by re-encoding the path", async ({ page }) => {
    for (const path of ["/%61ccount/library", "/account/./library", "/account//library"]) {
      await page.goto(path);
      // Either sent to sign in, or not a page at all — never the library.
      await expect(page).not.toHaveURL(/\/account\/library$/);
    }
  });

  test("a digital download needs a signed-in, entitled customer", async ({ request }) => {
    const response = await request.get("/api/library/not-a-real-asset", { maxRedirects: 0 });

    expect(response.status()).not.toBe(200);
    expect(response.headers()["location"] ?? "").not.toMatch(/^https?:\/\/(?!localhost)/);
  });

  test("the webhook refuses an oversized body before hashing it", async ({ request }) => {
    const response = await request.post("/api/webhooks/razorpay", {
      headers: { "content-type": "application/json", "x-razorpay-signature": "0" },
      data: "x".repeat(300 * 1024),
    });

    expect(response.status()).toBe(413);
  });

  test("the webhook only answers POST", async ({ request }) => {
    expect((await request.get("/api/webhooks/razorpay")).status()).toBe(405);
  });

  test("the revalidate endpoint rejects a guessed bearer token", async ({ request }) => {
    const response = await request.post("/api/revalidate", { headers: { authorization: "Bearer guess" } });

    // 401 with a secret configured; 404 when the endpoint is switched off.
    expect([401, 404, 429]).toContain(response.status());
  });

  test("account pages are never cached", async ({ request }) => {
    const response = await request.get("/account/library", { maxRedirects: 0 });

    expect(response.headers()["cache-control"] ?? "").toMatch(/no-store/);
  });
});
