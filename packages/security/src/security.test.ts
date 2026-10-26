import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";
import { isHttpsUrl, isSafeHref, safeHrefOr } from "./href";
import { buildContentSecurityPolicy, staticSecurityHeaders } from "./headers";
import { rateLimit } from "./rate-limit";

describe("safeNextPath", () => {
  it.each([
    ["/account/library", "/account/library"],
    ["/books?genre=poetry#top", "/books?genre=poetry#top"],
    ["/", "/"],
  ])("keeps same-origin path %s", (input, expected) => {
    expect(safeNextPath(input, "/fallback")).toBe(expected);
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "/\\evil.example",
    "\\\\evil.example",
    "javascript:alert(1)",
    "evil.example",
    "/\u0000x",
    "/\r\nLocation: x",
    " //evil.example",
    "",
    null,
    undefined,
  ])("rejects %s", (input) => {
    expect(safeNextPath(input as string | null | undefined, "/fallback")).toBe("/fallback");
  });

  it("keeps percent-encoded characters encoded (harmless as a path)", () => {
    expect(safeNextPath("/%0d%0aLocation:x", "/fallback")).toBe("/%0d%0aLocation:x");
  });
});

describe("isSafeHref", () => {
  it.each(["/about", "#faq", "https://example.com", "http://example.com/x", "mailto:a@b.co", "tel:+911234567890"])(
    "accepts %s",
    (href) => expect(isSafeHref(href)).toBe(true)
  );

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    " javascript:alert(1)",
    "java\tscript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:x",
    "//evil.example",
    "/\\evil.example",
    "",
    null,
  ])("rejects %s", (href) => expect(isSafeHref(href as string | null)).toBe(false));

  it("safeHrefOr falls back", () => {
    expect(safeHrefOr("javascript:alert(1)")).toBe("#");
    expect(safeHrefOr("/ok")).toBe("/ok");
  });
});

describe("isHttpsUrl", () => {
  it("accepts https only", () => {
    expect(isHttpsUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(isHttpsUrl("http://cdn.example.com/a.png")).toBe(false);
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false);
    expect(isHttpsUrl("data:image/png;base64,AAAA")).toBe(false);
  });
});

describe("headers", () => {
  it("builds a nonce CSP that forbids framing and plugins", () => {
    const csp = buildContentSecurityPolicy({ nonce: "abc", development: false });
    expect(csp).toContain("script-src 'self' 'nonce-abc' 'strict-dynamic'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("only adds HSTS in production", () => {
    expect(staticSecurityHeaders({ production: false }).some((h) => h.key === "Strict-Transport-Security")).toBe(false);
    expect(staticSecurityHeaders({ production: true }).some((h) => h.key === "Strict-Transport-Security")).toBe(true);
  });
});

describe("rateLimit (in-memory fallback)", () => {
  it("blocks after the limit within a window", async () => {
    const rule = { name: `test.${Math.random()}`, limit: 3, windowSeconds: 60 };
    const results = [];
    for (let i = 0; i < 5; i++) results.push((await rateLimit(rule, "user-1")).ok);
    expect(results).toEqual([true, true, true, false, false]);
    expect((await rateLimit(rule, "user-2")).ok).toBe(true);
  });
});
