import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

// Integration tests: app code against a real Postgres (TEST_DATABASE_URL),
// with only the outside world — the staff session, Next's request scope — stubbed.
// See docs/testing.md.
const config = mergeConfig(
  base,
  defineConfig({
    test: {
      include: ["testing/integration/**/*.test.ts"],
      setupFiles: ["testing/integration/setup.ts"],
      // One database, emptied before each test: never run files side by side.
      fileParallelism: false,
      testTimeout: 30_000,
      hookTimeout: 180_000,
    },
  })
);

// mergeConfig concatenates arrays; this suite runs only its own files.
config.test!.include = ["testing/integration/**/*.test.ts"];

export default config;
