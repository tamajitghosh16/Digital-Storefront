import "server-only";
import { TAG_TTL_SECONDS, cacheNamespace, cacheStore, tagKey, upstashConfig } from "./keys";

/**
 * Records in Redis that `tags` changed, so every storefront process stops
 * serving entries built before now — the same write apps/web's cache
 * handler makes for `revalidateTag()` (apps/web/cache-handler.mjs).
 *
 * apps/admin calls this after a save (lib/storefront-cache.ts). Writing the
 * ledger directly, rather than only asking the storefront over HTTP, means
 * an invalidation lands even while the storefront is asleep or restarting.
 *
 * A no-op unless `CACHE_STORE=redis` and the Upstash credentials are set.
 * Never throws: a failed write is logged, and the entries still expire
 * within their TTL (packages/cache/src/policy.ts).
 */

const LEDGER_TIMEOUT_MS = 1_000;

export async function writeTagLedger(tags: readonly string[], now: number = Date.now()): Promise<boolean> {
  if (tags.length === 0 || cacheStore() !== "redis") return false;
  const config = upstashConfig();
  if (!config) return false;

  const namespace = cacheNamespace();
  const commands = [...new Set(tags)].map((tag) => [
    "SET",
    tagKey(namespace, tag),
    String(now),
    "EX",
    String(TAG_TTL_SECONDS),
  ]);

  try {
    const response = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
      signal: AbortSignal.timeout(LEDGER_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Upstash responded ${response.status}`);
    const results = (await response.json()) as { error?: string }[];
    const failed = results.find((result) => result.error);
    if (failed) throw new Error(failed.error);
    return true;
  } catch (error) {
    console.error("[cache] could not record invalidated tags in Redis; they expire within their TTL", error);
    return false;
  }
}
