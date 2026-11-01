import { defineConfig, devices } from "@playwright/test";
import base from "./playwright.config";

// Cross-browser + device run: the @smoke, @sanity and @responsive tests on
// every engine and form factor shoppers use — Firefox, Safari (WebKit) on
// desktop, iPhone and iPad, and an Android tablet. Slower than the everyday
// Chromium run, so CI runs it nightly (and on demand), not on every push.
//
// Needs the extra browsers once: `npx playwright install firefox webkit`.

const cover = /@smoke|@sanity|@responsive/;
const signedIn = /\.auth\.spec\.ts$/;

export default defineConfig({
  ...base,
  outputDir: "./test-results/cross-browser",
  reporter: [[process.env.CI ? "github" : "list"], ["html", { outputFolder: "./playwright-report/cross-browser", open: "never" }]],
  projects: [
    { name: "firefox", use: { ...devices["Desktop Firefox"] }, grep: cover, testIgnore: signedIn },
    { name: "safari", use: { ...devices["Desktop Safari"] }, grep: cover, testIgnore: signedIn },
    { name: "iphone", use: { ...devices["iPhone 14"] }, grep: /@smoke|@sanity/, testIgnore: signedIn },
    { name: "ipad", use: { ...devices["iPad (gen 7)"] }, grep: /@smoke|@sanity/, testIgnore: signedIn },
    { name: "android-tablet", use: { ...devices["Galaxy Tab S4"] }, grep: /@smoke|@sanity/, testIgnore: signedIn },
  ],
});
