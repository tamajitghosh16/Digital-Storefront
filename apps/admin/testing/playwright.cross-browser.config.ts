import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// Cross-browser run: the @smoke and @sanity tests on Firefox and Safari
// (WebKit) — whatever browser the Publisher's office machines run. Nightly
// and on demand in CI, not on every push.
//
// Needs the extra browsers once: `npx playwright install firefox webkit`.

const cover = /@smoke|@sanity/;
const signedIn = /\.auth\.spec\.ts$/;

export default defineConfig({
  ...base,
  outputDir: "./test-results/cross-browser",
  reporter: [[process.env.CI ? "github" : "list"], ["html", { outputFolder: "./playwright-report/cross-browser", open: "never" }]],
  projects: [
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, grep: cover, testIgnore: signedIn },
    { name: "safari", use: { ...devices["Desktop Safari"] }, grep: cover, testIgnore: signedIn },
  ],
});
