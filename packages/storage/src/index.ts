import { put, del, head } from "@vercel/blob";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Vercel Blob helpers — manuscripts, covers, proofs, and delivery assets
 * (Technical Design Document, Section 3.7).
 *
 * Uploads go to a staging prefix first so the malware-scan Inngest job can
 * gate promotion to the permanent path (NFR-8).
 */
export async function uploadToStaging(file: File | Blob, pathHint: string) {
  const key = `staging/${crypto.randomUUID()}-${pathHint}`;
  return put(key, file, { access: "public", addRandomSuffix: false });
}

export async function promoteFromStaging(stagingUrl: string, permanentPath: string, file: Blob) {
  const result = await put(permanentPath, file, { access: "public", addRandomSuffix: false });
  await del(stagingUrl);
  return result;
}

/**
 * The public Supabase Storage bucket that admin images live in. Create it
 * once from the Supabase dashboard (Storage → New bucket, public).
 */
const IMAGE_BUCKET = "images";

/**
 * The PRIVATE Supabase Storage bucket that purchased e-book PDFs live in.
 * Create it once from the Supabase dashboard (Storage → New bucket, with
 * "Public bucket" left OFF). Nothing is ever served from it directly — the
 * admin uploads via a short-lived signed upload URL, and the storefront's
 * entitlement-checked /api/library/[assetId] route mints a short-lived
 * signed download URL per request.
 */
const EBOOK_BUCKET = "ebooks";

let cachedServiceClient: SupabaseClient | null = null;

/**
 * Service-role Supabase client used only for server-side Storage operations
 * (admin image uploads, e-book upload/download URL signing). The
 * service-role key bypasses Storage's Row-Level Security, which is fine
 * here: every caller has already checked the actor is an EDITOR/OWNER (admin
 * routes) or holds a PAID entitlement (the library route) before this runs.
 * Never import this into client code — SUPABASE_SERVICE_ROLE_KEY must not
 * reach the browser bundle.
 */
function storageServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase Storage isn't configured: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set."
    );
  }
  cachedServiceClient ??= createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedServiceClient;
}

/** True when the environment has what `uploadImage` needs. Lets the route give a friendly message instead of throwing. */
export function isImageUploadConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Same requirement as image uploads — the private e-book bucket uses the same project + service-role key. */
export function isEbookStorageConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/** Filesystem-safe object name from a user-supplied filename, keeping the last 80 chars. */
function safeObjectName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
}

/**
 * Mints a one-time signed URL the browser can `PUT` an e-book PDF straight
 * to, bypassing the app server entirely (so there's no serverless
 * request-body size cap on the file). The token is already baked into the
 * returned `uploadUrl`'s query string, so the caller needs no Supabase SDK —
 * just `fetch(uploadUrl, { method: "PUT", body: file })`.
 */
export async function createEbookUploadUrl(fileName: string): Promise<{ path: string; uploadUrl: string }> {
  const path = `${crypto.randomUUID()}-${safeObjectName(fileName) || "ebook.pdf"}`;
  const supabase = storageServiceClient();
  const { data, error } = await supabase.storage.from(EBOOK_BUCKET).createSignedUploadUrl(path);
  if (error) throw error;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const uploadUrl = /^https?:\/\//.test(data.signedUrl) ? data.signedUrl : `${base}${data.signedUrl}`;
  return { path: data.path, uploadUrl };
}

/** Short-lived signed download URL for a stored e-book PDF (default 5 minutes). */
export async function createEbookDownloadUrl(path: string, expiresInSeconds = 300): Promise<string> {
  const supabase = storageServiceClient();
  const { data, error } = await supabase.storage.from(EBOOK_BUCKET).createSignedUrl(path, expiresInSeconds);
  if (error) throw error;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return /^https?:\/\//.test(data.signedUrl) ? data.signedUrl : `${base}${data.signedUrl}`;
}

/** Best-effort removal of an e-book object — used when an editor replaces or clears the PDF. */
export async function deleteEbookFile(path: string): Promise<void> {
  try {
    await storageServiceClient().storage.from(EBOOK_BUCKET).remove([path]);
  } catch {
    // A stray object is harmless; there's no sweep job yet.
  }
}

/**
 * Image uploads from apps/admin (book covers, banner art, testimonial
 * portraits, the site logo).
 *
 * Deliberately *not* routed through the staging → scan → promote pipeline
 * above. That pipeline exists for files a customer or author supplies —
 * manuscripts, source documents — where the uploader isn't trusted. These
 * come from a signed-in EDITOR/OWNER, are type- and signature-checked before
 * they get here, and are needed at a stable public URL the moment the form
 * is saved. Sending them through a scan that is currently a stub returning
 * "CLEAN" (packages/jobs/src/functions/malwareScan.ts) would add a
 * round-trip and imply a guarantee that doesn't exist yet.
 *
 * Stored in the public `images` Supabase Storage bucket; the returned
 * `url` is the bucket's permanent public URL for the object.
 */
export async function uploadImage(file: File | Blob, fileName: string): Promise<{ url: string; path: string }> {
  const safeName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  const path = `${crypto.randomUUID()}-${safeName}`;

  const supabase = storageServiceClient();
  const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw error;

  const {
    data: { publicUrl },
  } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path);
  return { url: publicUrl, path };
}

export async function quarantine(stagingUrl: string) {
  // In production, move to a `quarantine/` prefix instead of deleting
  // outright, so infected uploads remain available for investigation.
  await del(stagingUrl);
}

/**
 * Mints a short-lived signed download URL for a digital library asset.
 * Vercel Blob doesn't support expiring URLs natively for public blobs, so
 * digital delivery assets should be stored with `access: "private"` and
 * served through a Route Handler (see apps/web/app/api/library/[assetId])
 * that streams the file after checking entitlement + download count.
 */
export async function getAssetMetadata(url: string) {
  return head(url);
}
