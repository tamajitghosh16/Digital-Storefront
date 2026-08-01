import Link from "next/link";
import { Breadcrumb, PageHeader, SectionHead, Standfirst, Wrap, buttonClass } from "@/components/primitives";
import { ReturnsBand } from "@/components/marketing";
import { BOOK_GENRES } from "@/lib/navigation";
import { CatalogueToolbar, type CatalogueQuery } from "./catalogue-toolbar";
import { ProductGrid, ProductTile, type ProductTileData } from "./product-tile";

/**
 * The listing page, shared by /books and /ebooks. Filtering and sorting
 * are read from the query string and applied here on the server, so any
 * result set is linkable and the masthead search composes with the chips.
 */

const FORMATS = [
  { glyph: "▤", label: "Paperback", note: "Standard trade", href: "/books" },
  { glyph: "▥", label: "Hardcover", note: "Case-bound", href: "/books" },
  { glyph: "▦", label: "Spiral", note: "Workbooks", href: "/books" },
  { glyph: "▧", label: "Large print", note: "16pt setting", href: "/books" },
  { glyph: "◫", label: "EPUB", note: "Apple, Kobo", href: "/ebooks" },
  { glyph: "◧", label: "MOBI", note: "Kindle", href: "/ebooks" },
  { glyph: "◨", label: "PDF", note: "Print-ready", href: "/ebooks" },
  { glyph: "≡", label: "Class set", note: "From 10 copies", href: "/books" },
];

export function CataloguePage({
  basePath,
  title,
  standfirst,
  products,
  query,
  companionPrices,
}: {
  basePath: string;
  title: string;
  standfirst: string;
  products: ProductTileData[];
  query: CatalogueQuery;
  /** Base slug → the other edition's price, for the tile's alternates line. */
  companionPrices?: Map<string, number>;
}) {
  const term = query.q?.trim().toLowerCase();

  const results = products
    .filter((product) => {
      if (query.genre && product.genre !== query.genre) return false;
      if (term && !`${product.title} ${product.author} ${product.genre ?? ""}`.toLowerCase().includes(term)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (query.sort) {
        case "price":
          return a.priceCents - b.priceCents;
        case "price-desc":
          return b.priceCents - a.priceCents;
        case "reviews":
          return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
        case "title":
          return a.title.localeCompare(b.title);
        case "new":
          return 0;
        default:
          return (b.rating ?? 0) - (a.rating ?? 0) || (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      }
    });

  // Only offer genres that actually have titles behind them.
  const available = new Set(products.map((product) => product.genre).filter(Boolean) as string[]);
  const genres = BOOK_GENRES.filter((genre) => available.has(genre));

  return (
    <>
      <Wrap>
        <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: title }]} />
      </Wrap>

      <PageHeader>
        <h1>{title}</h1>
        <Standfirst>{standfirst}</Standfirst>
        <div className="mt-[22px] flex flex-wrap gap-3">
          <Link href={`${basePath}#titles`} className={buttonClass("primary")}>
            Browse titles
          </Link>
          <Link href="/self-publishing/wizard/step-1" className={buttonClass("secondary")}>
            Upload a manuscript
          </Link>
          <Link href="/account/orders" className={buttonClass("ghost")}>
            Reorder
          </Link>
        </div>
      </PageHeader>

      <Wrap as="section" className="pb-6 pt-12">
        <SectionHead title="Shop by format" standfirst="Same manuscript, different object." />
        <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(132px,1fr))]">
          {FORMATS.map((format) => (
            <Link
              key={format.label}
              href={format.href}
              className="rounded-tile bg-tile p-[18px] transition-colors hover:bg-tile-2 inset-ring inset-ring-card-edge"
            >
              <span aria-hidden className="text-[22px]">
                {format.glyph}
              </span>
              <strong className="mt-2.5 block text-sm">{format.label}</strong>
              <small className="text-xs text-ink-muted">{format.note}</small>
            </Link>
          ))}
        </div>
      </Wrap>

      <Wrap as="section" id="titles" className="scroll-mt-6 pb-12 pt-4">
        <CatalogueToolbar basePath={basePath} genres={genres} query={query} resultCount={results.length} />

        {results.length > 0 ? (
          <ProductGrid>
            {results.map((product) => (
              <ProductTile
                key={product.id}
                product={product}
                ebookCents={companionPrices?.get(product.slug.replace(/-ebook$/, ""))}
              />
            ))}
          </ProductGrid>
        ) : (
          <div className="rounded-tile bg-tile px-6 py-16 text-center inset-ring inset-ring-card-edge">
            <h3>Nothing matched that.</h3>
            <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
              Try a different genre, or clear the filters to see the whole catalogue.
            </p>
            <Link href={basePath} className={buttonClass("secondary", "md", "mt-5")}>
              Show everything
            </Link>
          </div>
        )}

        <ReturnsBand />
      </Wrap>
    </>
  );
}
