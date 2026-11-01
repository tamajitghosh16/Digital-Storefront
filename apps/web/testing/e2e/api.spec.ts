import { expect, test } from "@playwright/test";

// HTTP-level checks — Playwright's `request` client, no browser. Each one
// pins down a security rule from docs/security-roadmap.md.

test("the Razorpay webhook refuses an unsigned call @smoke", async ({ request }) => {
  const response = await request.post("/api/webhooks/razorpay", {
    data: { event: "payment.captured", payload: {} },
  });

  // Only a signature-verified webhook may mark an order PAID.
  expect(response.status()).toBe(401);
});

test("the Razorpay webhook refuses a forged signature", async ({ request }) => {
  const response = await request.post("/api/webhooks/razorpay", {
    headers: { "x-razorpay-signature": "0".repeat(64) },
    data: { event: "payment.captured", payload: {} },
  });

  expect(response.status()).toBe(401);
});

test("the revalidate endpoint requires the shared secret", async ({ request }) => {
  const response = await request.post("/api/revalidate", { data: { tags: ["cms"] } });

  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect(response.status()).toBeLessThan(500);
});

test("pages are served with a nonce Content-Security-Policy @smoke", async ({ request }) => {
  const response = await request.get("/");
  const csp = response.headers()["content-security-policy"] ?? response.headers()["content-security-policy-report-only"];

  expect(csp).toMatch(/script-src[^;]*'nonce-/);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
});
