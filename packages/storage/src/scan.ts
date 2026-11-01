import "server-only";
import { securityEvent } from "@repo/security/log";

/**
 * NFR-8: every uploaded manuscript/source file is scanned before it is
 * exposed anywhere else in the system.
 *
 * Scans with Cloudmersive's Virus Scan API when `CLOUDMERSIVE_API_KEY` is
 * set. Fails CLOSED: with no key, or if the scanner errors, the file stays
 * `PENDING` — never `CLEAN` — so nothing gated on the scan (library
 * downloads require `CLEAN`) can serve it. Throws on a transient scanner or
 * download failure; the caller records the result on `FileAsset` and
 * decides whether to retry (nothing retries automatically).
 */
export type ScanResult = "CLEAN" | "INFECTED" | "PENDING";

const CLOUDMERSIVE_SCAN_URL = "https://api.cloudmersive.com/virus/scan/file/advanced";
/** Cloudmersive's per-request ceiling on most plans; larger files need their cloud-storage scan API. */
const MAX_SCAN_BYTES = 100 * 1024 * 1024;

export async function scanUpload(blobPath: string): Promise<ScanResult> {
  const apiKey = process.env.CLOUDMERSIVE_API_KEY;
  if (!apiKey) {
    securityEvent("malware.scan_skipped", { reason: "CLOUDMERSIVE_API_KEY not set", blobPath });
    return "PENDING";
  }

  // Staged uploads are private Vercel Blob objects: fetch with the store token.
  const download = await fetch(blobPath, {
    headers: process.env.BLOB_READ_WRITE_TOKEN ? { Authorization: `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}` } : {},
    cache: "no-store",
  });
  if (!download.ok) throw new Error(`Could not fetch upload for scanning (${download.status})`);
  const bytes = await download.arrayBuffer();
  if (bytes.byteLength > MAX_SCAN_BYTES) {
    securityEvent("malware.scan_skipped", { reason: "file too large for inline scan", blobPath, bytes: bytes.byteLength });
    return "PENDING";
  }

  const form = new FormData();
  form.append("inputFile", new Blob([bytes]), blobPath.split("/").pop() ?? "upload");
  const response = await fetch(CLOUDMERSIVE_SCAN_URL, {
    method: "POST",
    headers: {
      Apikey: apiKey,
      // Treat anything that can carry active content as unsafe, not just known signatures.
      allowExecutables: "false",
      allowInvalidFiles: "false",
      allowScripts: "false",
      allowPasswordProtectedFiles: "false",
      allowMacros: "false",
      allowXmlExternalEntities: "false",
      allowInsecureDeserialization: "false",
      allowHtml: "false",
    },
    body: form,
  });
  if (!response.ok) throw new Error(`Scanner responded ${response.status}`);
  const result = (await response.json()) as { CleanResult?: boolean; FoundViruses?: { VirusName?: string }[] | null };

  if (result.CleanResult === true) return "CLEAN";
  securityEvent("malware.detected", {
    blobPath,
    viruses: (result.FoundViruses ?? []).map((virus) => virus.VirusName).filter(Boolean),
  });
  return "INFECTED";
}
