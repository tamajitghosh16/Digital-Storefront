import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@repo/auth/server";
import { prisma } from "@repo/database";
import { SectionHead, buttonClass } from "@/components/primitives";
import { BookJacket, ProductShot } from "@/components/commerce/book-jacket";

export const metadata: Metadata = { title: "Digital library" };

// FR-8.2 / FR-9.1 / FR-9.2: instant digital delivery. Every EBOOK_FILE asset
// attached to a product this customer has a PAID order for shows here, with a
// real download link served by GET /api/library/[assetId] (entitlement- and
// download-count-checked, mints a short-lived signed Supabase URL).
export default async function DigitalLibraryPage() {
  const user = await getCurrentUser();

  const assets = user
    ? await prisma.fileAsset.findMany({
        where: {
          kind: "EBOOK_FILE",
          product: { orderItems: { some: { order: { userId: user.id, status: "PAID" } } } },
        },
        include: { product: true },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <section>
      <SectionHead title="Digital library" standfirst="Every e-book you own, with downloads remaining." />

      {assets.length === 0 ? (
        <div className="rounded-tile bg-tile px-6 py-14 text-center inset-ring inset-ring-card-edge">
          <h3>Nothing here yet</h3>
          <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
            Purchased e-books and delivered service files appear here the moment payment clears.
          </p>
          <Link href="/educational-material/books" className={buttonClass("secondary", "md", "mt-5")}>
            Shop e-books
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {assets.map((asset) => {
            const remaining =
              asset.maxDownloads != null ? Math.max(0, asset.maxDownloads - asset.downloadCount) : null;
            const exhausted = remaining === 0;
            return (
              <div key={asset.id} className="flex gap-4 rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
                <ProductShot square className="w-[74px] shrink-0 rounded-[10px] bg-ground p-2">
                  <BookJacket
                    title={asset.product?.title ?? asset.fileName}
                    imageUrl={asset.product?.coverImageUrl}
                    className="w-[66%]"
                    sizes="60px"
                  />
                </ProductShot>

                <div className="min-w-0 flex-1">
                  <h4>{asset.product?.title ?? asset.fileName}</h4>
                  <p className="mt-1 text-sm text-ink-muted">
                    {asset.product?.author ? `${asset.product.author} · ` : ""}PDF
                  </p>
                  <p
                    className={
                      exhausted
                        ? "mt-2 text-xs font-bold text-sale"
                        : "mt-2 text-xs tabular-nums text-ink-muted"
                    }
                  >
                    {remaining == null
                      ? "Unlimited downloads"
                      : exhausted
                        ? "No downloads left"
                        : `${remaining} of ${asset.maxDownloads} downloads left`}
                  </p>

                  {exhausted ? (
                    <span
                      title="You've used every download for this file. Contact support for a reset."
                      className={buttonClass("secondary", "sm", "mt-3.5 pointer-events-none opacity-60")}
                    >
                      Request a reset
                    </span>
                  ) : (
                    <a
                      href={`/api/library/${asset.id}`}
                      className={buttonClass("primary", "sm", "mt-3.5")}
                    >
                      Download
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
