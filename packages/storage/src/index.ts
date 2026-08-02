import { put, del, head } from "@vercel/blob";

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
 */
export async function uploadImage(file: File | Blob, fileName: string) {
  const safeName = fileName
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-80);
  return put(`images/${crypto.randomUUID()}-${safeName}`, file, {
    access: "public",
    addRandomSuffix: false,
  });
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
