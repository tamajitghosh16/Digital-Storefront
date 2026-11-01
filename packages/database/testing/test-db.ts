import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Shared plumbing for tests that need a real Postgres: the migration tests
 * here and the integration tests in apps/web and apps/admin. Test-only —
 * nothing under src/ imports it. See docs/testing.md.
 *
 * These tests TRUNCATE every table, so the URL comes from its own variable
 * (TEST_DATABASE_URL, from the shell or the repo-root `.env.test`), never
 * from DATABASE_URL, and has to be a local database unless explicitly
 * overridden.
 */

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

let checked: string | null | undefined;

/**
 * TEST_DATABASE_URL if it's set and safe to wipe; otherwise `null` (the suite
 * skips). Checked once per process: integration setup then points
 * DATABASE_URL at it, which a second check would mistake for a clash.
 */
export function testDatabaseUrl(): string | null {
  if (checked !== undefined) return checked;
  try {
    process.loadEnvFile(path.join(repoRoot, ".env.test"));
  } catch {
    // No .env.test — the shell may still set it.
  }
  const url = process.env.TEST_DATABASE_URL?.trim();
  if (!url) return (checked = null);

  const { hostname } = new URL(url);
  if (!LOCAL_HOSTS.has(hostname) && process.env.ALLOW_REMOTE_TEST_DATABASE !== "1") {
    throw new Error(
      `TEST_DATABASE_URL points at ${hostname}. These tests delete every row, so they only run against a ` +
        "local database. Set ALLOW_REMOTE_TEST_DATABASE=1 if this really is a throwaway database."
    );
  }
  for (const name of ["DATABASE_URL", "DIRECT_URL"] as const) {
    if (process.env[name] && process.env[name] === url) {
      throw new Error(`TEST_DATABASE_URL is the same as ${name}; use a separate database for tests.`);
    }
  }
  return (checked = url);
}

/** Runs a Prisma CLI command in packages/database against `url`. */
export function prisma(args: string[], url: string, { allowFailure = false } = {}) {
  const result = spawnSync("npx", ["prisma", ...args], {
    cwd: packageRoot,
    env: { ...process.env, DIRECT_URL: url, DATABASE_URL: url },
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(`prisma ${args.join(" ")} failed (exit ${result.status}):\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

/** Brings the test database up to the latest migration. Idempotent. */
export function migrateTestDatabase(url: string): void {
  prisma(["migrate", "deploy"], url);
}

type RawClient = {
  $queryRawUnsafe<T = unknown>(query: string): Promise<T>;
  $executeRawUnsafe(query: string): Promise<number>;
};

/** Empties every application table (keeps the migration history). */
export async function resetTestDatabase(client: RawClient): Promise<void> {
  const tables = await client.$queryRawUnsafe<{ tablename: string }[]>(
    "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'"
  );
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(", ");
  await client.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
