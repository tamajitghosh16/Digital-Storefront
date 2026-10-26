/**
 * Applies server-side limits to the Supabase Storage buckets (see
 * hardenStorageBuckets in ../src/index.ts). Idempotent — safe to re-run.
 *
 *   npm run harden-buckets --workspace=@repo/storage
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from the
 * environment, falling back to apps/admin/.env.local.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, "../../../apps/admin/.env.local") });

const { hardenStorageBuckets } = await import("../src/buckets");
for (const line of await hardenStorageBuckets()) console.log(line);
