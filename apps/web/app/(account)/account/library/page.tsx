import type { Metadata } from "next";
import Link from "next/link";
import { SAMPLE_LIBRARY_ITEMS } from "@/lib/sample-data";
import { SectionHead, buttonClass } from "@/components/primitives";
import { BookJacket, ProductShot } from "@/components/commerce/book-jacket";

export const metadata: Metadata = { title: "Digital library" };

// FR-8.2: instant digital delivery via the account library. Real download
// links are minted by GET /api/library/[assetId] (signed, expiring,
// entitlement-checked); the button is inert until that lands.
const DOWNLOAD_LIMIT = 5;

export default function DigitalLibraryPage() {
  const items = SAMPLE_LIBRARY_ITEMS;

  return (
    <section>
      <SectionHead title="Digital library" standfirst="Every e-book you own, with downloads remaining." />

      {items.length === 0 ? (
        <div className="rounded-tile bg-tile px-6 py-14 text-center inset-ring inset-ring-card-edge">
          <h3>Nothing here yet</h3>
          <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
            Purchased e-books and delivered service files appear here the moment payment clears.
          </p>
          <Link href="/ebooks" className={buttonClass("secondary", "md", "mt-5")}>
            Shop e-books
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {items.map((item, index) => {
            // Sample data has no download ledger yet; vary it so the
            // exhausted state is visible in review.
            const remaining = index === 2 ? 0 : DOWNLOAD_LIMIT - index;
            return (
              <div
                key={item.id}
                className="flex gap-4 rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge"
              >
                <ProductShot square className="w-[74px] shrink-0 rounded-[10px] bg-ground p-2">
                  <BookJacket
                    title={item.title}
                    from={item.coverFrom}
                    to={item.coverTo}
                    className="w-[66%]"
                    sizes="60px"
                  />
                </ProductShot>

                <div className="min-w-0 flex-1">
                  <h4>{item.title}</h4>
                  <p className="mt-1 text-sm text-ink-muted">
                    {item.author} · {item.formats.join(", ")}
                  </p>
                  <p
                    className={
                      remaining === 0
                        ? "mt-2 text-xs font-bold text-sale"
                        : "mt-2 text-xs tabular-nums text-ink-muted"
                    }
                  >
                    {remaining === 0 ? "No downloads left" : `${remaining} of ${DOWNLOAD_LIMIT} downloads left`}
                  </p>
                  <button
                    type="button"
                    disabled
                    title="Sample data preview — no file to download"
                    className={buttonClass(remaining === 0 ? "secondary" : "primary", "sm", "mt-3.5")}
                  >
                    {remaining === 0 ? "Request a reset" : "Download"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
