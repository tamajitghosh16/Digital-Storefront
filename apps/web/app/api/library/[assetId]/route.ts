import { NextResponse } from "next/server";
import { getCurrentUser } from "@repo/auth/server";
import { prisma } from "@repo/database";
import { createEbookDownloadUrl } from "@repo/storage";
import { securityEvent } from "@repo/security/log";
import { RATE_LIMITS, rateLimit } from "@repo/security/rate-limit";
import { entitledAssetsWhere } from "@/lib/library";

/**
 * FR-8.2/FR-9.1/FR-9.2: signed, entitlement-checked, download-count-limited
 * digital delivery. Route Handler (not a Server Action) because it needs a
 * stable, linkable URL and streams a redirect to the actual file.
 *
 * Entitlement rules live in lib/library.ts. The per-customer download count
 * is claimed atomically (a conditional increment), so two parallel requests
 * can't both take the last download.
 */
const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401, headers: NO_STORE });

  if (!(await rateLimit(RATE_LIMITS.libraryDownload, user.id)).ok) {
    return NextResponse.json({ error: "Too many downloads — please wait a few minutes." }, { status: 429, headers: NO_STORE });
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(assetId)) {
    return NextResponse.json({ error: "Not available" }, { status: 404, headers: NO_STORE });
  }

  const asset = await prisma.fileAsset.findFirst({
    where: { id: assetId, ...entitledAssetsWhere(user.id) },
    select: { id: true, blobPath: true, maxDownloads: true },
  });
  if (!asset) {
    // One answer for "doesn't exist", "not scanned" and "not yours", so the
    // endpoint can't be used to probe which asset ids exist.
    securityEvent("library.not_entitled", { userId: user.id, assetId });
    return NextResponse.json({ error: "Not available" }, { status: 404, headers: NO_STORE });
  }

  // Claim one download for this customer, atomically.
  await prisma.libraryDownload.upsert({
    where: { userId_fileAssetId: { userId: user.id, fileAssetId: asset.id } },
    create: { userId: user.id, fileAssetId: asset.id },
    update: {},
  });
  const claimed = await prisma.libraryDownload.updateMany({
    where: {
      userId: user.id,
      fileAssetId: asset.id,
      ...(asset.maxDownloads != null ? { count: { lt: asset.maxDownloads } } : {}),
    },
    data: { count: { increment: 1 }, lastDownloadedAt: new Date() },
  });
  if (claimed.count === 0) {
    securityEvent("library.limit_reached", { userId: user.id, assetId: asset.id });
    return NextResponse.json({ error: "Download limit reached" }, { status: 403, headers: NO_STORE });
  }
  // All-customers total, kept for reporting only.
  await prisma.fileAsset.update({ where: { id: asset.id }, data: { downloadCount: { increment: 1 } } });

  // Legacy/seed rows store a full public URL; e-books uploaded from the admin
  // store a private Supabase Storage path, which we sign for ~5 minutes.
  if (/^https:\/\//.test(asset.blobPath)) {
    return NextResponse.redirect(asset.blobPath, { headers: NO_STORE });
  }
  if (/^[a-z]+:/i.test(asset.blobPath)) {
    return NextResponse.json({ error: "Not available" }, { status: 404, headers: NO_STORE });
  }
  try {
    const signedUrl = await createEbookDownloadUrl(asset.blobPath, 300);
    return NextResponse.redirect(signedUrl, { headers: { ...NO_STORE, "Referrer-Policy": "no-referrer" } });
  } catch (error) {
    console.error("[library] failed to sign download URL", error);
    // Give the claimed download back — the customer never got the file.
    await prisma.libraryDownload
      .updateMany({ where: { userId: user.id, fileAssetId: asset.id, count: { gt: 0 } }, data: { count: { decrement: 1 } } })
      .catch(() => {});
    return NextResponse.json({ error: "Download temporarily unavailable" }, { status: 502, headers: NO_STORE });
  }
}
