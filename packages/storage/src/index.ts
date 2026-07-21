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
