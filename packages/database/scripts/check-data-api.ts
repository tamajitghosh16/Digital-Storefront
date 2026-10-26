/**
 * Security regression check for finding C1 (docs/security-roadmap.md):
 * proves that no Prisma-managed table can be read through Supabase's public
 * REST API with the publishable (anon) key.
 *
 *   npm run check:data-api --workspace=@repo/database
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY from
 * the environment, falling back to apps/web/.env.local. Read-only: one
 * `GET ...?limit=1` per table, nothing is written. Exits non-zero if any
 * table answers 200 with rows, so it can gate CI or a deploy.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../../apps/web/.env.local") });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY must be set.");
  process.exit(2);
}

const schema = readFileSync(resolve(here, "../prisma/schema.prisma"), "utf8");
const tables = [...schema.matchAll(/@@map\("([^"]+)"\)/g)].map((match) => match[1]!).concat("_prisma_migrations");

type Outcome = { table: string; status: number; rows: number | null; verdict: "blocked" | "empty" | "EXPOSED" };

async function probe(table: string): Promise<Outcome> {
  const response = await fetch(`${url}/rest/v1/${table}?select=*&limit=1`, {
    headers: { apikey: key!, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) return { table, status: response.status, rows: null, verdict: "blocked" };
  const body = (await response.json()) as unknown[];
  const rows = Array.isArray(body) ? body.length : null;
  return { table, status: response.status, rows, verdict: rows ? "EXPOSED" : "empty" };
}

const results = await Promise.all(tables.map(probe));
console.table(results);

const exposed = results.filter((result) => result.verdict === "EXPOSED");
const readableEmpty = results.filter((result) => result.verdict === "empty");
if (readableEmpty.length) {
  console.warn(
    `\n${readableEmpty.length} table(s) answered 200 with no rows — RLS is on but the anon role still has SELECT, or the table is simply empty. ` +
      "After the lock_down_data_api migration these should be 401/403/404."
  );
}
if (exposed.length) {
  console.error(`\nFAIL: ${exposed.length} table(s) return data to the public key: ${exposed.map((e) => e.table).join(", ")}`);
  process.exit(1);
}
console.log("\nOK: no table returned rows to the public key.");
