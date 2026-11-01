/* global process, __dirname -- a Node config file, run by the lhci CLI */
// Lighthouse CI: page-performance budgets for the storefront. See docs/testing.md.
//
//   npm run test:perf --workspace=web     # builds, serves on :3100, audits
//   E2E_WEB_URL=https://<preview> npm run test:perf --workspace=web
//
// Lighthouse's default profile is a mid-range phone on a slow 4G link —
// the right yardstick for most of this shop's customers. Reports land in
// testing/performance/reports/ (never uploaded anywhere).

const path = require("node:path");

const external = process.env.E2E_WEB_URL || "";
const base = (external || "http://localhost:3100").replace(/\/$/, "");

// Lighthouse needs a real Chrome: the installed one is found automatically;
// CHROME_PATH overrides it (CI sets it to the runner's Chrome).
const chromePath = process.env.CHROME_PATH || undefined;

const bypass = process.env.E2E_VERCEL_BYPASS;

module.exports = {
  ci: {
    collect: {
      url: ["/", "/educational-material/books", "/self-publishing", "/sign-in"].map((p) => base + p),
      numberOfRuns: 3,
      chromePath,
      ...(external
        ? {}
        : {
            startServerCommand: "npm run build && npx next start -p 3100",
            startServerReadyPattern: "Ready",
            startServerReadyTimeout: 600000,
          }),
      settings: {
        ...(bypass ? { extraHeaders: JSON.stringify({ "x-vercel-protection-bypass": bypass }) } : {}),
        // `--no-sandbox` is needed on CI containers; harmless locally.
        chromeFlags: "--no-sandbox --headless=new",
      },
    },
    assert: {
      assertions: {
        // Hard budgets: regressions here are bugs, not tuning.
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        // Soft budgets: reported, not failing, until a baseline is agreed.
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],
        "categories:seo": ["warn", { minScore: 0.9 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],
        // Previews and local builds are deliberately noindex (app/robots.ts).
        "is-crawlable": "off",
      },
    },
    upload: {
      target: "filesystem",
      outputDir: path.join(__dirname, "reports"),
    },
  },
};
