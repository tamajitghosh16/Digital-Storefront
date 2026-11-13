import { afterEach, describe, expect, it, vi } from "vitest";
import { siteUrl, siteUrlProblem } from "@/lib/site-url";

function env(vars: Record<string, string>) {
  for (const name of ["NEXT_PUBLIC_STOREFRONT_URL", "VERCEL_PROJECT_PRODUCTION_URL", "DEPLOY_ENV", "VERCEL_ENV"]) {
    vi.stubEnv(name, vars[name] ?? "");
  }
}

describe("siteUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("uses the configured storefront URL, without a trailing slash", () => {
    env({ NEXT_PUBLIC_STOREFRONT_URL: "https://www.example.in/", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" });
    expect(siteUrl()).toBe("https://www.example.in");
  });

  it("falls back to Vercel's production domain, then the dev server", () => {
    env({ VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" });
    expect(siteUrl()).toBe("https://x.vercel.app");
    env({});
    expect(siteUrl()).toBe("http://localhost:3000");
  });
});

describe("siteUrlProblem", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("refuses a Hostinger deployment with no storefront URL", () => {
    env({ DEPLOY_ENV: "production" });
    expect(siteUrlProblem()).toMatch(/NEXT_PUBLIC_STOREFRONT_URL is not set/);
  });

  it("passes a Hostinger deployment that sets it", () => {
    env({ DEPLOY_ENV: "production", NEXT_PUBLIC_STOREFRONT_URL: "https://www.example.in" });
    expect(siteUrlProblem()).toBeNull();
  });

  it("passes Vercel, which has its own fallback", () => {
    env({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" });
    expect(siteUrlProblem()).toBeNull();
  });

  it("passes a local run, which has no deployment label", () => {
    env({});
    expect(siteUrlProblem()).toBeNull();
  });
});
