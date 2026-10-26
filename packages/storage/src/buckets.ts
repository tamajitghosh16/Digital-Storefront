import { createClient } from "@supabase/supabase-js";

/**
 * One-off hardening of the two Supabase Storage buckets, run by
 * `npm run harden-buckets --workspace=@repo/storage` (scripts/harden-buckets.ts).
 * Kept out of ./index.ts, which is `server-only` and so can't be imported
 * from a plain Node CLI.
 *
 * Server-side limits that hold even for uploads that bypass the app (the
 * admin's signed e-book upload URLs):
 *  - `ebooks`: private, PDF only, 100 MB max;
 *  - `images`: public (covers are shown on the storefront), raster image
 *    types only (no SVG — it can carry script), 5 MB max.
 */
export async function hardenStorageBuckets(): Promise<string[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

  const settings = [
    { id: "ebooks", public: false, allowedMimeTypes: ["application/pdf"], fileSizeLimit: "100MB" },
    {
      id: "images",
      public: true,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
      fileSizeLimit: "5MB",
    },
  ];

  const results: string[] = [];
  for (const bucket of settings) {
    const { error } = await supabase.storage.updateBucket(bucket.id, {
      public: bucket.public,
      allowedMimeTypes: bucket.allowedMimeTypes,
      fileSizeLimit: bucket.fileSizeLimit,
    });
    results.push(
      error
        ? `${bucket.id}: FAILED — ${error.message}`
        : `${bucket.id}: ok (${bucket.public ? "public" : "private"}, ${bucket.allowedMimeTypes.join(", ")}, ≤ ${bucket.fileSizeLimit})`
    );
  }
  return results;
}
