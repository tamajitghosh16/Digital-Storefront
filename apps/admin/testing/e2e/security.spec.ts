import { expect, test } from "@playwright/test";

// @security: the back office from the outside. Everything here must hold
// for an anonymous visitor who knows the URLs. See access.spec.ts for the
// route-by-route sign-in gate.

const productionBuild = !!process.env.CI || !!process.env.E2E_ADMIN_URL;

const API_ROUTES = ["/api/uploads", "/api/uploads/ebook"];

test.describe("@security", () => {
  test("security headers are set, and nothing is cached", async ({ request }) => {
    const headers = (await request.get("/sign-in")).headers();

    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["cache-control"]).toMatch(/no-store/);
    expect(headers["x-powered-by"]).toBeUndefined();
  });

  test("the CSP forbids inline script, plugins and framing", async ({ request }) => {
    const csp = (await request.get("/sign-in")).headers()["content-security-policy"] ?? "";
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";

    expect(scriptSrc).toMatch(/'nonce-[^']+'/);
    expect(scriptSrc).not.toContain("'unsafe-inline'");
    if (productionBuild) expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });

  for (const route of API_ROUTES) {
    for (const method of ["GET", "POST"] as const) {
      test(`${method} ${route} refuses an anonymous caller`, async ({ request }) => {
        const response = await request.fetch(route, { method, maxRedirects: 0, data: method === "POST" ? {} : undefined });

        expect([301, 302, 303, 307, 308, 401, 403, 405]).toContain(response.status());
      });
    }
  }

  test("invite links are served with no referrer, so tokens never leak", async ({ request }) => {
    const response = await request.get("/join/not-a-real-token");

    expect(response.headers()["referrer-policy"]).toBe("no-referrer");
  });

  test("the sign-in page never offers a way to create an account", async ({ page }) => {
    await page.goto("/sign-in");

    await expect(page.getByText(/sign up|create (an )?account|register/i)).toHaveCount(0);
  });

  test("a forged staff session cookie gets nowhere", async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const host = new URL(baseURL!).hostname;
    await context.addCookies([
      { name: "sb-forged-auth-token", value: "base64-eyJhY2Nlc3NfdG9rZW4iOiJmb3JnZWQifQ", domain: host, path: "/" },
    ]);
    const page = await context.newPage();

    await page.goto("/settings/roles");

    await expect(page).toHaveURL(/\/sign-in/);
    await context.close();
  });

  test("path tricks don't skip the sign-in gate", async ({ page }) => {
    for (const path of ["/%73ettings/roles", "/sign-in/../settings/roles", "/sign-in/%2e%2e/settings/roles", "/join/../orders"]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/sign-in|\/join\//);
    }
  });
});
