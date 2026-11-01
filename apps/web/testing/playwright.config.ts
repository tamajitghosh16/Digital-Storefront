import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, devices } from "@playwright/test";
import { CUSTOMER_STATE, hasCustomerCredentials } from "./e2e/support/auth";

// Browser + HTTP tests (testing/e2e) for the storefront. See docs/testing.md.
//
// Locally this starts (or reuses) `npm run dev` on :3000; in CI it builds
// and runs the production server instead. Set E2E_WEB_URL to test a running
// deployment — e.g. the post-deploy smoke run against a Vercel preview.
//
// Tests are grouped by tag in their titles — @smoke, @sanity, @security,
// @a11y, @visual — and run by tag from package.json (`test:smoke` …).
// Firefox, WebKit and tablet run from playwright.cross-browser.config.ts.

const testingDir = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(testingDir, "..");

// Test-account credentials and target URLs (see .env.e2e.example). Optional:
// shell variables work too, and without either the signed-in tests are skipped.
try {
  process.loadEnvFile(path.join(testingDir, ".env.e2e"));
} catch {
  // No .env.e2e — fine.
}

// `||`, not `??`: a blank line in .env.e2e reads as "".
const externalBaseURL = process.env.E2E_WEB_URL || undefined;
const baseURL = externalBaseURL ?? "http://localhost:3000";
const ci = !!process.env.CI;
// Vercel Deployment Protection on previews: the bypass token lets tests in.
const vercelBypass = process.env.E2E_VERCEL_BYPASS || undefined;

const signedIn = /\.auth\.spec\.ts$/;

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  // A dev server compiles each route on first visit, which can take a while.
  timeout: 60_000,
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { animations: "disabled", caret: "hide", maxDiffPixelRatio: 0.01 },
  },
  // Baselines differ by OS (font rendering), so each platform keeps its own.
  snapshotPathTemplate: "{testDir}/__screenshots__/{platform}/{testFilePath}/{arg}{ext}",
  // A missing baseline is written rather than failed — the first run on a new
  // platform records it (commit it), every later run compares against it.
  updateSnapshots: "missing",
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 2 : 0,
  workers: ci ? 1 : undefined,
  reporter: [[ci ? "github" : "list"], ["html", { outputFolder: "./playwright-report", open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    extraHTTPHeaders: vercelBypass
      ? { "x-vercel-protection-bypass": vercelBypass, "x-vercel-set-bypass-cookie": "true" }
      : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] }, testIgnore: signedIn, grepInvert: /@visual/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testIgnore: signedIn, grepInvert: /@visual|@security|@responsive/ },
    // Screenshots on one fixed browser and viewport only: compared pixel by
    // pixel, so they must not vary run to run.
    { name: "visual", use: { ...devices["Desktop Chrome"] }, testIgnore: signedIn, grep: /@visual/ },
    // Signed-in flows only run when a test customer's credentials are set
    // (E2E_CUSTOMER_EMAIL / E2E_CUSTOMER_PASSWORD), so a fresh checkout can
    // still run everything else.
    ...(hasCustomerCredentials()
      ? [
          { name: "setup", testMatch: /auth\.setup\.ts$/ },
          {
            name: "signed-in",
            testMatch: signedIn,
            dependencies: ["setup"],
            use: { ...devices["Desktop Chrome"], storageState: CUSTOMER_STATE },
          },
        ]
      : []),
  ],
  webServer: externalBaseURL
    ? undefined
    : {
        // CI tests what ships: the production build, not the dev server.
        command: ci ? "npm run build && npm run start" : "npm run dev",
        cwd: appRoot,
        url: baseURL,
        reuseExistingServer: !ci,
        timeout: ci ? 600_000 : 180_000,
      },
});
