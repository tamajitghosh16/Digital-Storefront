import Link from "next/link";
import { Star } from "lucide-react";
import { Breadcrumb, Rule, SectionHead, Wrap } from "@/components/primitives";
import type { PricingConfig } from "@/lib/pricing";
import { BOOKS_LINE } from "@/lib/product-lines";
import { BookPurchase, type BookFormatOffer } from "./book-purchase";
import { JacketGallery } from "./jacket-gallery";
import { ProductScroller, ProductTile, type ProductTileData } from "./product-tile";
import { ReviewSummary } from "./review-summary";
import { WishlistButton } from "./wishlist-button";

/**
 * The product page for a book, at /educational-material/books/[slug].
 *
 * Two columns from `md` up: the jacket gallery on the left stays pinned
 * (sticky) while the details column on the right scrolls past it — title,
 * format picker and buy buttons, then the about / author / specifications /
 * reviews sections. Below `md` it's one column, gallery first, nothing
 * sticky. The related-titles row runs full width underneath.
 *
 * The other Educational Materials lines still use `ProductPage`.
 */

export interface BookPageData {
  id: string;
  title: string;
  author: string;
  description: string | null;
  coverImageUrl: string | null;
  backCoverImageUrl?: string | null;
  prefaceImageUrl?: string | null;
  indexPageImageUrl?: string | null;
  isbn?: string | null;
  pages?: number | null;
  weightGrams?: number | null;
  language?: string | null;
  /** E-book file formats — EPUB, PDF, … */
  formats?: string[];
  genre?: string;
  rating?: number;
  reviewCount?: number;
  coverFrom?: string;
  coverTo?: string;
}

/** One edition of the book as the route offers it — the picker is built from these. */
export interface BookEditionOffer {
  format: "PAPERBACK" | "HARDCOVER" | "EBOOK";
  priceCents: number;
  /** Printed copies on hand. `null` = not tracked; always null for the e-book. */
  stockQty: number | null;
  /** Why it can't be bought right now — "Out of stock", "Already in your library". */
  unavailable?: string;
}

const FORMAT_KIND = { PAPERBACK: "paperback", HARDCOVER: "hardcover", EBOOK: "ebook" } as const;
const FORMAT_LABEL = { PAPERBACK: "Paperback", HARDCOVER: "Hardcover", EBOOK: "E-book" } as const;

export function BookPage({
  product,
  editions,
  related,
  pricing,
  isSignedIn,
}: {
  product: BookPageData;
  /** Every format the book is sold in (one to three), Paperback → Hardcover → E-book. */
  editions: BookEditionOffer[];
  related: ProductTileData[];
  /** Admin-managed pricing rules, loaded by the route that renders this. */
  pricing: PricingConfig;
  isSignedIn: boolean;
}) {
  const section = { label: BOOKS_LINE.label, href: BOOKS_LINE.base };
  const delivery = `Delivered ${pricing.delivery.standardEta}`;

  // Each edition is its own card in the picker and its own cart line
  // (`<productId>:paperback` / `:hardcover` / `:ebook` — see `bookLineId`
  // in @repo/database), so checkout knows exactly which one was bought.
  const offers: BookFormatOffer[] = editions.map((edition) => ({
    kind: FORMAT_KIND[edition.format],
    lineId: `${product.id}:${FORMAT_KIND[edition.format]}`,
    priceCents: edition.priceCents,
    detail: edition.format === "EBOOK" ? "Available instantly" : delivery,
    stockQty: edition.format === "EBOOK" ? null : edition.stockQty,
    unavailable: edition.unavailable,
  }));
  const hasEbook = editions.some((edition) => edition.format === "EBOOK");
  const hasPrint = editions.some((edition) => edition.format !== "EBOOK");

  const specs: { term: string; detail: string }[] = [
    { term: "ISBN", detail: product.isbn ?? "" },
    { term: "Pages", detail: product.pages ? String(product.pages) : "" },
    { term: "Language", detail: product.language ?? "" },
    { term: "Genre", detail: product.genre ?? "" },
    { term: "Formats", detail: editions.map((edition) => FORMAT_LABEL[edition.format]).join(", ") },
    { term: "E-book files", detail: hasEbook ? (product.formats ?? []).join(", ") : "" },
    { term: "Weight", detail: hasPrint && product.weightGrams ? `${product.weightGrams} g` : "" },
    { term: "Imprint", detail: "New School Book Press" },
  ].filter((spec) => spec.detail);

  return (
    <>
      <Wrap>
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Educational Materials" },
            { label: section.label, href: section.href },
            { label: product.title },
          ]}
        />
      </Wrap>

      <Wrap className="grid gap-8 pb-12 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:gap-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-16">
        <div className="mx-auto w-full max-w-[340px] md:sticky md:top-6 md:mx-0 md:max-w-none md:self-start">
          <JacketGallery
            title={product.title}
            author={product.author}
            coverImageUrl={product.coverImageUrl}
            backCoverImageUrl={product.backCoverImageUrl}
            prefaceImageUrl={product.prefaceImageUrl}
            indexPageImageUrl={product.indexPageImageUrl}
            from={product.coverFrom}
            to={product.coverTo}
            flag={(product.reviewCount ?? 0) > 100 ? "Bestseller" : undefined}
          />
        </div>

        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-[30px] leading-[1.1] lg:text-[36px]">{product.title}</h1>
            <div className="flex shrink-0 items-center gap-2.5 pt-1">
              {typeof product.rating === "number" && (
                <a
                  href="#reviews"
                  aria-label={`Rated ${product.rating.toFixed(1)} out of 5 — see reviews`}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums inset-ring-2 inset-ring-line-strong hover:inset-ring-ink"
                >
                  {product.rating.toFixed(1)}
                  <Star aria-hidden className="h-3.5 w-3.5 fill-current" />
                </a>
              )}
              <WishlistButton productId={product.id} />
            </div>
          </div>

          <p className="mt-2 text-base">by {product.author}</p>
          {(product.genre || product.language) && (
            <div className="mt-2.5 flex flex-col gap-0.5 text-sm text-ink-muted">
              {product.genre && (
                <Link
                  href={`${section.href}?genre=${encodeURIComponent(product.genre)}`}
                  className="w-fit underline-offset-2 hover:text-ink hover:underline"
                >
                  {product.genre}
                </Link>
              )}
              {product.language && <span>Language: {product.language}</span>}
            </div>
          )}

          <div className="mt-6">
            <BookPurchase
              title={product.title}
              offers={offers}
              tiers={pricing.classSetTiers}
              isSignedIn={isSignedIn}
            />
          </div>

          <Rule className="my-8" />

          <section aria-labelledby="about-book">
            <h2 id="about-book">About the Book</h2>
            {product.description && (
              <p className="mt-3.5 max-w-[66ch] whitespace-pre-line text-base leading-[1.65] text-ink-muted">
                {product.description}
              </p>
            )}
            <p className="mt-3.5 max-w-[66ch] text-base leading-[1.65] text-ink-muted">
              Published by Shashibhushan&rsquo;s New School Book Press. 25% of the sale volume from this listing is
              contributed to the Sashibhusan Book Press Memorial Trust.
            </p>
          </section>

          <Rule className="my-8" />

          {/* Placeholder until author profiles exist. */}
          <section aria-labelledby="about-author">
            <h2 id="about-author">About the Author</h2>
            <p className="mt-3.5 max-w-[66ch] text-base leading-[1.65] text-ink-muted">
              A profile of {product.author} is coming soon.
            </p>
          </section>

          <Rule className="my-8" />

          <section aria-labelledby="book-specs">
            <h2 id="book-specs">Book Specifications</h2>
            <dl className="mt-4 grid overflow-hidden rounded-tile bg-tile text-sm inset-ring inset-ring-card-edge lg:grid-cols-2">
              {specs.map((spec) => (
                <div
                  key={spec.term}
                  className="grid grid-cols-[minmax(0,130px)_minmax(0,1fr)] gap-3 border-b border-line px-[18px] py-[13px]"
                >
                  <dt className="font-bold">{spec.term}</dt>
                  <dd className="break-words tabular-nums">{spec.detail}</dd>
                </div>
              ))}
            </dl>
          </section>

          <Rule className="my-8" />

          <section id="reviews" aria-labelledby="customer-reviews" className="scroll-mt-8">
            <h2 id="customer-reviews">Customer Reviews</h2>
            <ReviewSummary
              rating={product.rating}
              reviewCount={product.reviewCount}
              emptyLabel="No reviews for this title yet."
            />
          </section>
        </div>
      </Wrap>

      {related.length > 0 && (
        <Wrap as="section" className="pb-12">
          <SectionHead title="Readers also bought" href={section.href} />
          <ProductScroller>
            {related.map((item) => (
              <ProductTile key={item.id} product={item} />
            ))}
          </ProductScroller>
        </Wrap>
      )}
    </>
  );
}
