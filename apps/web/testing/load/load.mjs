// Load test for the storefront (autocannon). See docs/testing.md.
//
//   npm run test:load --workspace=web                      # localhost:3000
//   LOAD_TEST_URL=https://staging.example.in npm run test:load --workspace=web -- --confirm-remote
//
// Point it at a production build (`npm run build && npm run start`) or a
// staging deploy — a dev server compiles on demand and measures nothing
// useful. NEVER at production: every request below reads the shared
// Supabase database, and the point is to push it.
//
// Each scenario fails the run if its p99 latency or error rate breaks budget.
// 429s are counted apart from errors: they're the rate limiter doing its job
// (every request here comes from one IP), not the site failing.

import autocannon from "autocannon";

const target = new URL(process.env.LOAD_TEST_URL || "http://localhost:3000");
const local = ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname);
if (!local && !process.argv.includes("--confirm-remote")) {
  console.error(
    `Refusing to load-test ${target.origin} without --confirm-remote. Staging only — never production.`
  );
  process.exit(2);
}

const connections = Number(process.env.LOAD_CONNECTIONS || 20);
const duration = Number(process.env.LOAD_DURATION || 20);
const bypass = process.env.E2E_VERCEL_BYPASS;
const headers = bypass ? { "x-vercel-protection-bypass": bypass } : {};

/** Budgets: p99 in ms, errors as a fraction of requests. */
const SCENARIOS = [
  { name: "homepage", path: "/", p99: 2500, maxErrorRate: 0.01 },
  { name: "books listing", path: "/educational-material/books", p99: 2500, maxErrorRate: 0.01 },
  { name: "catalogue API", path: "/api/books", p99: 1500, maxErrorRate: 0.01 },
  { name: "policy page", path: "/shipping-policy", p99: 1500, maxErrorRate: 0.01 },
];

/**
 * A few requests before measuring, so the budgets see the steady state, not
 * the cold start: the first hit fills the CMS/catalogue caches from a
 * database a few hundred ms away (apps/web/lib/cms.ts).
 */
async function warmUp(scenario) {
  for (let i = 0; i < 3; i += 1) await fetch(new URL(scenario.path, target), { headers });
}

function run(scenario) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      { url: new URL(scenario.path, target).href, connections, duration, headers },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    autocannon.track(instance, { renderProgressBar: false, renderResultsTable: false });
  });
}

console.log(`Load test: ${target.origin}, ${connections} connections × ${duration}s per scenario\n`);

let failed = false;
const rows = [];
for (const scenario of SCENARIOS) {
  await warmUp(scenario);
  const result = await run(scenario);
  const rateLimited = result.statusCodeStats?.["429"]?.count ?? 0;
  const errors = result.errors + result.timeouts + result.non2xx - rateLimited;
  const errorRate = result.requests.total ? errors / result.requests.total : 1;
  const p99 = result.latency.p99;
  const ok = p99 <= scenario.p99 && errorRate <= scenario.maxErrorRate;
  failed ||= !ok;
  rows.push({
    scenario: scenario.name,
    "req/s": Math.round(result.requests.average),
    "p50 ms": result.latency.p50,
    "p99 ms": `${p99} (≤${scenario.p99})`,
    errors: `${(errorRate * 100).toFixed(2)}% (≤${scenario.maxErrorRate * 100}%)`,
    "429s": rateLimited,
    result: ok ? "pass" : "FAIL",
  });
}

console.table(rows);
if (failed) {
  console.error("\nLoad test failed: a scenario broke its latency or error budget.");
  process.exit(1);
}
