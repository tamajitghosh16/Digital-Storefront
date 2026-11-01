import { defineConfig } from "vitest/config";

// `npm run test`: the pure unit tests next to their source. The migration
// suite in testing/ needs a database and runs separately
// (`npm run test:migrations`, testing/vitest.migrations.config.ts).
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
  },
});
