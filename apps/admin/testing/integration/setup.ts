import { beforeAll } from "vitest";
import { migrateTestDatabase, testDatabaseUrl } from "@repo/database/testing";

// Runs before each test file is imported, so the Prisma client the app code
// creates on import connects to the test database, never to .env.local's.
const url = testDatabaseUrl();
if (url) {
  process.env.DATABASE_URL = url;
  process.env.DIRECT_URL = url;
}

let migrated = false;
beforeAll(() => {
  if (url && !migrated) {
    migrateTestDatabase(url);
    migrated = true;
  }
});
