import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, prisma, testDatabaseUrl } from "./test-db";

// Database migration tests. Production only ever runs `prisma migrate
// deploy` (docs/production-launch.md), so this checks exactly that path,
// from an empty database, the way a new environment (staging, a restore)
// would see it.

const url = testDatabaseUrl();
const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The Supabase roles. lock_down_data_api only revokes their privileges when
// they exist, so create them first to exercise that branch on plain Postgres.
const SUPABASE_ROLES = ["anon", "authenticated"];
// The only tables the Data API roles may read (own-row RLS policies).
const DATA_API_READABLE = ["orders", "self_publishing_projects", "users"];

describe.skipIf(!url)("database migrations", () => {
  let db: PrismaClient;

  beforeAll(async () => {
    db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url! }) });

    // Start from nothing: drop every table, type and the migration history.
    await db.$executeRawUnsafe("DROP SCHEMA IF EXISTS public CASCADE");
    await db.$executeRawUnsafe("CREATE SCHEMA public");
    for (const role of SUPABASE_ROLES) {
      await db.$executeRawUnsafe(
        `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${role}') THEN CREATE ROLE ${role} NOLOGIN; END IF; END $$`
      );
    }

    migrateTestDatabase(url!);
  });

  afterAll(async () => {
    await db?.$disconnect();
  });

  it("applies every migration to an empty database", async () => {
    const applied = await db.$queryRawUnsafe<{ migration_name: string; finished_at: Date | null }[]>(
      "SELECT migration_name, finished_at FROM _prisma_migrations"
    );
    expect(applied.length).toBeGreaterThan(0);
    expect(applied.filter((m) => m.finished_at === null)).toEqual([]);
  });

  it("reports the database as up to date", () => {
    const status = prisma(["migrate", "status"], url!);
    expect(status.stdout).toContain("Database schema is up to date");
  });

  it("leaves no drift between schema.prisma and the migrations", () => {
    // Exit 2 = a difference: someone edited schema.prisma without
    // generating a migration (or hand-edited a migration).
    const diff = prisma(
      ["migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"],
      url!,
      { allowFailure: true }
    );
    expect(diff.status, diff.stdout + diff.stderr).toBe(0);
  });

  it("grants the Data API roles nothing beyond their own-row reads", async () => {
    const grants = await db.$queryRawUnsafe<{ table_name: string; privilege_type: string }[]>(
      `SELECT DISTINCT table_name, privilege_type FROM information_schema.role_table_grants
       WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated')`
    );
    for (const grant of grants) {
      expect(DATA_API_READABLE, `${grant.privilege_type} on ${grant.table_name}`).toContain(grant.table_name);
      expect(grant.privilege_type).toBe("SELECT");
    }
  });

  it("keeps row-level security on the tables the Data API can read", async () => {
    const tables = await db.$queryRawUnsafe<{ relname: string; relrowsecurity: boolean }[]>(
      `SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = ANY($1::text[])`,
      DATA_API_READABLE
    );
    expect(tables).toHaveLength(DATA_API_READABLE.length);
    expect(tables.every((t) => t.relrowsecurity)).toBe(true);
  });

  it("seeds a migrated database, and re-seeding is harmless", () => {
    const seed = () =>
      spawnSync("npx", ["tsx", "prisma/seed.ts"], {
        cwd: packageRoot,
        env: { ...process.env, DATABASE_URL: url!, DIRECT_URL: url! },
        encoding: "utf8",
        shell: process.platform === "win32",
      });
    for (const run of [seed(), seed()]) {
      expect(run.status, run.stdout + run.stderr).toBe(0);
    }
  });

  it("is still clean after a second deploy", () => {
    // Re-running deploy on an up-to-date database must be a no-op.
    expect(() => migrateTestDatabase(url!)).not.toThrow();
  });
});
