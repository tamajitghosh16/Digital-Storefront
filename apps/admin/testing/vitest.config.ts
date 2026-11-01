import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit, component and contract tests (testing/unit, testing/contracts).
// Browser flows live in testing/e2e and run under Playwright — see docs/testing.md.

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export default defineConfig({
  root: appRoot,
  // Next's tsconfig has `jsx: "preserve"`; Vitest has to compile JSX itself.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: [
      { find: /^@\//, replacement: `${appRoot}/` },
      // `server-only` throws outside a React Server Components bundle, so
      // server modules (Server Actions, app/settings/roles/actions.ts) couldn't be imported here.
      { find: "server-only", replacement: path.join(appRoot, "testing/unit/stubs/server-only.ts") },
    ],
  },
  test: {
    include: ["testing/unit/**/*.test.{ts,tsx}", "testing/contracts/**/*.test.ts"],
    // Node by default; a component test opts into a DOM with a
    // `// @vitest-environment jsdom` comment on its first line.
    environment: "node",
    setupFiles: ["testing/unit/setup.ts"],
  },
});
