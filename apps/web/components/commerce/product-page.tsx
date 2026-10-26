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
import { BOOKS_LINE, type ListingLine } from "@/lib/product-lines";
import { BuyBox } from "./buy-box";
import { JacketGallery } from "./jacket-gallery";
import { ReviewSummary } from "./review-summary";
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
 *
 * The other Educational Materials lines (charts, worksheets, teaching
 * materials) render here too, at `/educational-material/<line>/[slug]`:
 * `line` swaps the breadcrumb and drops the book-only parts — editions,
 * pages, binding, e-book formats, the publishing-services pitch.
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
  backCoverImageUrl?: string | null;
  prefaceImageUrl?: string | null;
  indexPageImageUrl?: string | null;
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
  line = BOOKS_LINE,
}: {
  product: ProductPageData;
  /** Which product line this belongs to — Books unless a line's own route says otherwise. */
  line?: ListingLine;
  /** The other edition's price, when this title is published both ways. */
  companionPriceCents?: number;
  related: ProductTileData[];
  /** Admin-managed pricing rules, loaded by the route that renders this. */
  pricing: PricingConfig;
}) {
  const isEbook = product.type === "EBOOK";
  const isBook = line.isBook;
  const noun = isBook ? (isEbook ? "e-book" : "book") : line.noun.one;
  const section = { label: line.label, href: line.base };

  const printCents = isEbook ? companionPriceCents : product.priceCents;
  const ebookCents = isEbook ? product.priceCents : companionPriceCents;
  const ebookFormats = product.formats?.length ? product.formats : ["EPUB", "MOBI", "PDF"];

  const editions = buildEditions({
    printCents,
    ebookCents,
    pages: product.pages,
    formats: ebookFormats,
    bundleAddCents: pricing.bundleEbookAddCents,
  }).map((edition) =>
    // A non-book item is only ever the one shipped product, never a paperback.
    isBook ? edition : { ...edition, label: "Standard", detail: "Shipped to your door", note: "Ships from Kolkata" }
  );

  const fromCents = Math.min(
    ...[printCents, ebookCents].filter((cents): cents is number => typeof cents === "number")
  );
  const inStock = (product.stockQty ?? 0) > 0;

  const availability: { label: string; detail: string }[] = [];
  if (!isBook) {
    const tracked = typeof product.stockQty === "number";
    availability.push({
      label: !tracked || inStock ? "Available" : "Out of stock",
      detail: !tracked || inStock ? "Ships from Kolkata" : "Currently out of stock",
    });
  } else if (printCents !== undefined) {
    availability.push({
      label: "Printed edition",
      detail: inStock ? "Paperback · ships from Kolkata" : "Paperback · currently out of stock",
    });
  }
  if (ebookCents !== undefined) {
    availability.push({ label: "E-book", detail: `${ebookFormats.join(" · ")} · instant download` });
  }

  const facts: { term: string; detail: string }[] = isBook
    ? [
        { term: "Pages", detail: product.pages ? String(product.pages) : "—" },
        { term: "ISBN", detail: product.isbn ?? "—" },
        { term: "Language", detail: "English" },
        { term: "Genre", detail: product.genre ?? "General" },
      ]
    : [
        { term: "Product code", detail: product.isbn ?? "—" },
        { term: "Range", detail: line.label },
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
                backCoverImageUrl={product.backCoverImageUrl}
                prefaceImageUrl={product.prefaceImageUrl}
                indexPageImageUrl={product.indexPageImageUrl}
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

          <h2>About this {noun}</h2>
          {product.description && (
            <p className="mt-3.5 max-w-[66ch] whitespace-pre-line text-base leading-[1.65] text-ink-muted">
              {product.description}
            </p>
          )}
          <p className="mt-3.5 max-w-[66ch] text-base leading-[1.65] text-ink-muted">
            Published by Shashibhushan&rsquo;s New School Book Press. 25% of the sale volume from this listing is
            contributed to the Sashibhusan Book Press Memorial Trust.
          </p>

          {isBook && (
            <>
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
            </>
          )}

          <Rule />

          <section id="reviews" className="scroll-mt-8">
            <h2>{isBook ? "Reader reviews" : "Reviews"}</h2>
            <ReviewSummary
              rating={product.rating}
              reviewCount={product.reviewCount}
              emptyLabel={`No reviews for this ${isBook ? "title" : noun} yet.`}
            />
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
              stockQty={product.stockQty}
              supportsClassSets={printCents !== undefined}
              pricing={pricing}
              isBook={isBook}
            />

            {isBook && (
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
            )}
          </div>
        </aside>
      </Wrap>

      {related.length > 0 && (
        <Wrap as="section" className="pb-12">
          <SectionHead title={isBook ? "Readers also bought" : "You may also like"} href={section.href} />
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
