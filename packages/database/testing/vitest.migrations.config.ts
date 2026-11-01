import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Migration tests: apply every migration to an empty Postgres and check the
// result. Needs TEST_DATABASE_URL — see docs/testing.md.
export default defineConfig({
  root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."),
  test: {
    include: ["testing/**/*.test.ts"],
    // One database, wiped by the suite: never run files side by side.
    fileParallelism: false,
    testTimeout: 180_000,
    hookTimeout: 180_000,
  },
});
