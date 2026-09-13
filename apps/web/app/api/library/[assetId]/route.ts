import { NextResponse } from "next/server";
import { getCurrentUser } from "@repo/auth/server";
import { prisma } from "@repo/database";
import { createEbookDownloadUrl } from "@repo/storage";

/**
 * FR-8.2/FR-9.1/FR-9.2: signed, entitlement-checked, download-count-limited
 * digital delivery. Route Handler (not a Server Action) because it needs a
 * stable, linkable URL and streams a redirect to the actual file.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const asset = await prisma.fileAsset.findUnique({ where: { id: assetId }, include: { product: { include: { orderItems: { include: { order: true } } } } } });
  if (!asset || asset.malwareScanStatus !== "CLEAN") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const entitled = asset.product?.orderItems.some((oi) => oi.order.userId === user.id && oi.order.status === "PAID");
  if (!entitled) return NextResponse.json({ error: "Not entitled" }, { status: 403 });

  if (asset.maxDownloads && asset.downloadCount >= asset.maxDownloads) {
    return NextResponse.json({ error: "Download limit reached" }, { status: 403 });
  }

  await prisma.fileAsset.update({ where: { id: asset.id }, data: { downloadCount: { increment: 1 } } });

  // Legacy/seed rows store a full public URL; e-books uploaded from the admin
  // store a private Supabase Storage path, which we sign for ~5 minutes.
  if (/^https?:\/\//.test(asset.blobPath)) {
    return NextResponse.redirect(asset.blobPath);
  }
  try {
    const signedUrl = await createEbookDownloadUrl(asset.blobPath, 300);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    console.error("[library] failed to sign download URL", error);
    return NextResponse.json({ error: "Download temporarily unavailable" }, { status: 502 });
  }
}
