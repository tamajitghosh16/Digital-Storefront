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

test("catalogue pages are cacheable for at most five minutes, with an ETag @sanity", async ({ request }) => {
  const response = await request.get("/api/books");
  expect(response.status()).toBe(200);

  // docs/adr/0001-caching-strategy.md: a minute fresh in a shared cache,
  // four more served stale while it refetches.
  const cacheControl = response.headers()["cache-control"] ?? "";
  expect(cacheControl).toMatch(/\bpublic\b/);
  expect(cacheControl).toMatch(/s-maxage=60\b/);
  expect(cacheControl).toMatch(/stale-while-revalidate=240\b/);
  expect(response.headers()["set-cookie"]).toBeUndefined();

  const etag = response.headers()["etag"];
  expect(etag).toMatch(/^W\/".+"$/);
  const revalidated = await request.get("/api/books", { headers: { "if-none-match": etag! } });
  expect(revalidated.status()).toBe(304);
});

test("a refused catalogue request is never cached", async ({ request }) => {
  const response = await request.get("/api/books?line=not-a-line");
  expect(response.status()).toBe(400);
  expect(response.headers()["cache-control"] ?? "").toMatch(/no-store/);
});

test("pages are served with a nonce Content-Security-Policy @smoke", async ({ request }) => {
  const response = await request.get("/");
  const csp = response.headers()["content-security-policy"] ?? response.headers()["content-security-policy-report-only"];

  expect(csp).toMatch(/script-src[^;]*'nonce-/);
  expect(response.headers()["x-content-type-options"]).toBe("nosniff");
});
