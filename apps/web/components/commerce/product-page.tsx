import Link from "next/link";
import {
  Breadcrumb,
  Callout,
  Rule,
  SectionHead,
  Stars,
  TABLE_CLASS,
  TD_CLASS,
  ROW_TH_CLASS,
  TableWrap,
  Wrap,
  buttonClass,
} from "@/components/primitives";
import { buildEditions, type PricingConfig } from "@/lib/pricing";
import { formatINRWhole } from "@/lib/format";
import { BuyBox } from "./buy-box";
import { JacketGallery } from "./jacket-gallery";
import { ProductScroller, ProductTile, type ProductTileData } from "./product-tile";

/**
 * The product page for a title, at /educational-material/books/[slug].
 *
 * Top band: the jacket gallery on the left, the title / author / rating /
 * availability / key facts beside it, and the configure-and-buy panel in
 * a sticky right rail. The prose sections — about, specifications, reader
 * reviews — run full-width down the main column below that band so they
 * keep a comfortable reading measure. Which editions are offered depends
 * on whether the title exists in both forms; a digital-only title simply
 * gets one option.
 */

export interface ProductPageData {
  id: string;
  type: "PHYSICAL_BOOK" | "EBOOK";
  title: string;
  author: string;
  slug: string;
  description: string | null;
  priceCents: number;
  coverImageUrl: string | null;
  stockQty?: number | null;
  isbn?: string | null;
  pages?: number | null;
  formats?: string[];
  genre?: string;
  rating?: number;
  reviewCount?: number;
  coverFrom?: string;
  coverTo?: string;
}

export function ProductPage({
  product,
  companionPriceCents,
  related,
  pricing,
}: {
  product: ProductPageData;
  /** The other edition's price, when this title is published both ways. */
  companionPriceCents?: number;
  related: ProductTileData[];
  /** Admin-managed pricing rules, loaded by the route that renders this. */
  pricing: PricingConfig;
}) {
  const isEbook = product.type === "EBOOK";
  const section = { label: "Books", href: "/educational-material/books" };

  const printCents = isEbook ? companionPriceCents : product.priceCents;
  const ebookCents = isEbook ? product.priceCents : companionPriceCents;
  const ebookFormats = product.formats?.length ? product.formats : ["EPUB", "MOBI", "PDF"];

  const editions = buildEditions({
    printCents,
    ebookCents,
    pages: product.pages,
    formats: ebookFormats,
    bundleAddCents: pricing.bundleEbookAddCents,
  });

  const fromCents = Math.min(
    ...[printCents, ebookCents].filter((cents): cents is number => typeof cents === "number")
  );
  const inStock = (product.stockQty ?? 0) > 0;
  const distribution = reviewDistribution(product.rating ?? 4.5);

  const availability: { label: string; detail: string }[] = [];
  if (printCents !== undefined) {
    availability.push({
      label: "Printed edition",
      detail: inStock ? "Paperback · ships from Kolkata" : "Paperback · currently out of stock",
    });
  }
  if (ebookCents !== undefined) {
    availability.push({ label: "E-book", detail: `${ebookFormats.join(" · ")} · instant download` });
  }

  const facts: { term: string; detail: string }[] = [
    { term: "Pages", detail: product.pages ? String(product.pages) : "—" },
    { term: "ISBN", detail: product.isbn ?? "—" },
    { term: "Language", detail: "English" },
    { term: "Genre", detail: product.genre ?? "General" },
  ];

  return (
    <>
      <Wrap>
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Educational Materials" },
            { label: section.label, href: section.href },
            ...(product.genre
              ? [{ label: product.genre, href: `${section.href}?genre=${encodeURIComponent(product.genre)}` }]
              : []),
            { label: product.title },
          ]}
        />
      </Wrap>

      <Wrap className="grid gap-9 pb-11 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-12">
        <div className="min-w-0">
          {/* Top band — jacket beside the title, rating and key facts. */}
          <div className="grid gap-8 sm:grid-cols-[minmax(0,290px)_1fr] sm:gap-10 lg:grid-cols-[minmax(0,310px)_1fr]">
            <div className="min-w-0">
              <JacketGallery
                title={product.title}
                author={product.author}
                coverImageUrl={product.coverImageUrl}
                from={product.coverFrom}
                to={product.coverTo}
                flag={(product.reviewCount ?? 0) > 100 ? "Bestseller" : undefined}
              />
            </div>

            <div className="min-w-0">
              <h1 className="text-[30px] leading-[1.1] lg:text-[34px]">{product.title}</h1>
              <p className="mt-2.5 text-[15px] text-ink-muted">
                {product.author}
                {product.genre && (
                  <>
                    {" · "}
                    <Link
                      href={`${section.href}?genre=${encodeURIComponent(product.genre)}`}
                      className="underline underline-offset-2 hover:text-ink"
                    >
                      {product.genre}
                    </Link>
                  </>
                )}
              </p>

              {typeof product.rating === "number" && (
                <a href="#reviews" className="mt-3.5 inline-flex items-center gap-2 text-xs text-ink-muted hover:text-ink">
                  <Stars rating={product.rating} />
                  <span className="tabular-nums">
                    {product.rating.toFixed(1)}
                    {typeof product.reviewCount === "number" && ` · ${product.reviewCount} reviews`}
                  </span>
                </a>
              )}

              {Number.isFinite(fromCents) && (
                <p className="mt-4 text-sm text-ink-muted">
                  {editions.length > 1 ? "From " : ""}
                  <span className="text-[17px] font-bold tabular-nums text-ink">{formatINRWhole(fromCents)}</span>
                  {" · inclusive of all taxes"}
                </p>
              )}

              {product.description && (
                <p className="mt-4 line-clamp-4 max-w-[54ch] text-[15px] leading-[1.6] text-ink-muted">
                  {product.description}
                </p>
              )}

              <ul className="mt-5 flex flex-col gap-2.5">
                {availability.map((option) => (
                  <li key={option.label} className="flex gap-2.5 text-sm">
                    <span aria-hidden className="mt-[3px] text-ok">
                      ✓
                    </span>
                    <span>
                      <strong className="font-bold">{option.label}</strong>
                      <span className="block text-xs text-ink-muted">{option.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="mt-6 grid max-w-[380px] grid-cols-2 gap-x-6 gap-y-3">
                {facts.map((fact) => (
                  <div key={fact.term}>
                    <dt className="caps text-ink-muted">{fact.term}</dt>
                    <dd className="mt-0.5 text-sm tabular-nums">{fact.detail}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <Rule className="my-9" />

          <h2>About this {isEbook ? "e-book" : "book"}</h2>
          {product.description && (
            <p className="mt-3.5 max-w-[66ch] whitespace-pre-line text-base leading-[1.65] text-ink-muted">
              {product.description}
            </p>
          )}
          <p className="mt-3.5 max-w-[66ch] text-base leading-[1.65] text-ink-muted">
            Published by Shashibhushan&rsquo;s New School Book Press. 25% of the sale volume from this listing is
            contributed to the Sashibhusan Book Press Memorial Trust.
          </p>

          <Rule />

          <h2 className="mb-4">Specifications</h2>
          <TableWrap>
            <table className={TABLE_CLASS}>
              <tbody>
                <tr>
                  <th scope="row" className={ROW_TH_CLASS}>
                    ISBN
                  </th>
                  <td className={`${TD_CLASS} tabular-nums`}>{product.isbn ?? "—"}</td>
                  <th scope="row" className={ROW_TH_CLASS}>
                    Pages
                  </th>
                  <td className={`${TD_CLASS} tabular-nums`}>{product.pages ?? "—"}</td>
                </tr>
                <tr>
                  <th scope="row" className={ROW_TH_CLASS}>
                    Binding
                  </th>
                  <td className={TD_CLASS}>{isEbook ? "Digital" : "Paperback, sewn"}</td>
                  <th scope="row" className={ROW_TH_CLASS}>
                    Dimensions
                  </th>
                  <td className={`${TD_CLASS} tabular-nums`}>{isEbook ? "—" : "198 × 129 mm"}</td>
                </tr>
                <tr>
                  <th scope="row" className={ROW_TH_CLASS}>
                    Language
                  </th>
                  <td className={TD_CLASS}>English</td>
                  <th scope="row" className={ROW_TH_CLASS}>
                    Genre
                  </th>
                  <td className={TD_CLASS}>{product.genre ?? "General"}</td>
                </tr>
                <tr>
                  <th scope="row" className={ROW_TH_CLASS}>
                    Imprint
                  </th>
                  <td className={TD_CLASS}>New School Book Press</td>
                  <th scope="row" className={ROW_TH_CLASS}>
                    E-book formats
                  </th>
                  <td className={TD_CLASS}>{ebookFormats.join(", ")}</td>
                </tr>
              </tbody>
            </table>
          </TableWrap>

          <Rule />

          <section id="reviews" className="scroll-mt-8">
            <h2>Reader reviews</h2>
            {typeof product.rating === "number" ? (
              <>
                <div className="mt-4 flex flex-wrap items-start gap-9">
                  <div className="shrink-0">
                    <p className="text-[52px] font-bold leading-none tracking-[-0.04em] tabular-nums">
                      {product.rating.toFixed(1)}
                    </p>
                    <Stars rating={product.rating} className="mt-2 block text-[15px]" />
                    <p className="mt-1.5 text-sm tabular-nums text-ink-muted">{product.reviewCount ?? 0} reviews</p>
                  </div>

                  <div className="flex min-w-[250px] flex-1 flex-col gap-2">
                    {distribution.map((share, index) => (
                      <div
                        key={index}
                        className="grid grid-cols-[46px_1fr_42px] items-center gap-3 text-[13px] text-ink-muted"
                      >
                        <span>{5 - index} star</span>
                        <span className="h-2 overflow-hidden rounded-full bg-tile-2">
                          <span className="block h-full rounded-full bg-ink" style={{ width: `${share}%` }} />
                        </span>
                        <span className="tabular-nums">{share}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-[22px] rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
                  <Callout tone="tile">What reviewers keep saying</Callout>
                  <p className="mt-3 text-[15px] leading-[1.6] text-ink-muted">
                    Review capture is a Phase 0 stub — the{" "}
                    <code className="rounded bg-ground px-1.5 py-0.5 font-mono text-[0.88em]">Review</code> model exists,
                    the submission flow doesn&rsquo;t yet. The distribution above is derived from the title&rsquo;s
                    average rating.
                  </p>
                </div>
              </>
            ) : (
              <p className="mt-3 text-[15px] text-ink-muted">No reviews for this title yet.</p>
            )}
          </section>
        </div>

        <aside className="min-w-0">
          <div className="flex flex-col gap-[18px] lg:sticky lg:top-6">
            <BuyBox
              productId={product.id}
              title={product.title}
              author={product.author}
              genre={product.genre}
              rating={product.rating}
              reviewCount={product.reviewCount}
              editions={editions}
              printCents={printCents}
              supportsClassSets={printCents !== undefined}
              pricing={pricing}
            />

            <div className="rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
              <Callout>Written something yourself?</Callout>
              <p className="mt-3 text-[15px] leading-[1.55] text-ink-muted">
                We set and print books like this one for other authors too — conversion from ₹7,900, full
                self-publishing from ₹9,999.
              </p>
              <Link href="/services" className={buttonClass("secondary", "md", "mt-4")}>
                See publishing services
              </Link>
            </div>
          </div>
        </aside>
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

/**
 * Star distribution implied by an average rating — an exponential decay
 * either side of the mean, normalised to 100. A 4.8 lands on roughly
 * 83/11/4/1/1, which is what a real long-tail distribution looks like.
 */
function reviewDistribution(rating: number): number[] {
  const raw = [5, 4, 3, 2, 1].map((star) => Math.exp(-2.2 * Math.abs(star - rating)));
  const total = raw.reduce((sum, value) => sum + value, 0);
  const shares = raw.map((value) => Math.max(1, Math.round((value / total) * 100)));

  // Rounding up to a 1% floor can overshoot; take the excess off the top bar.
  const drift = shares.reduce((sum, value) => sum + value, 0) - 100;
  shares[0] = Math.max(1, shares[0]! - drift);
  return shares;
}
