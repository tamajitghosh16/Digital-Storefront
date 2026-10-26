import Link from "next/link";
import { cn } from "@repo/ui/utils";
import { Stars } from "@/components/primitives";
import { formatINRWhole } from "@/lib/format";
import { BOOKS_BASE, type BookView } from "@/lib/books-query";
import type { BookListing } from "@/lib/books";
import { BookJacket, ProductShot } from "./book-jacket";
import { WishlistButton } from "./wishlist-button";

/**
 * One title in the books catalogue, in either a grid tile or a list row.
 *
 * The card is edition-agnostic by design: it shows the cheapest edition's
 * price (prefixed "from" when the editions differ in price) and one
 * fulfilment line — the printed promise while stock lasts, otherwise the
 * digital one. Which edition to buy is chosen on the detail page.
 */

function priceLabel(listing: BookListing): string {
  const price = formatINRWhole(listing.fromPriceCents);
  return listing.priceVaries ? `from ${price}` : price;
}

function fulfilment(listing: BookListing): { text: string; tone: string } {
  // A null `stockQty` means "not tracked", which `BuyBox` treats as always
  // orderable — say so here too rather than "unavailable".
  if (listing.hasPrint && listing.stockQty === null) return { text: "Ships in 2 days", tone: "text-ok" };
  const stock = listing.stockQty ?? 0;
  if (listing.hasPrint && stock > 0) {
    if (stock < 10) return { text: `Only ${stock} left`, tone: "text-warn" };
    if (stock >= 30) return { text: "Same-day delivery — Kolkata", tone: "text-ok" };
    return { text: "Ships in 2 days", tone: "text-ok" };
  }
  if (listing.hasEbook) return { text: "Instant download", tone: "text-ok" };
  return { text: "Currently unavailable", tone: "text-sale" };
}

export function BookCard({
  listing,
  view,
  base = BOOKS_BASE,
  priority = false,
}: {
  listing: BookListing;
  view: BookView;
  /** The product line's listing path; its detail pages live under it. */
  base?: string;
  /** First row on screen: fetch the cover eagerly instead of lazily. */
  priority?: boolean;
}) {
  const href = `${base}/${listing.slug}`;
  const ship = fulfilment(listing);

  const rating = typeof listing.rating === "number" && (
    <span className="flex items-center gap-1.5 text-xs text-ink-muted">
      <Stars rating={listing.rating} />
      <span className="tabular-nums">
        {listing.rating.toFixed(1)}
        {typeof listing.reviewCount === "number" && ` (${listing.reviewCount})`}
      </span>
    </span>
  );

  if (view === "list") {
    return (
      <Link href={href} className="group flex gap-4">
        <span className="w-[70px] shrink-0">
          <BookJacket
            title={listing.title}
            author={listing.author}
            imageUrl={listing.coverImageUrl}
            from={listing.coverFrom}
            to={listing.coverTo}
            sizes="70px"
            priority={priority}
          />
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-bold leading-[1.3] group-hover:underline">{listing.title}</span>
          <span className="text-[13px] text-ink-muted">{listing.author}</span>
          {listing.genre && <span className="mt-0.5 text-xs text-ink-subtle">{listing.genre}</span>}
          {rating && <span className="mt-1.5">{rating}</span>}
        </span>

        <WishlistButton productId={listing.id} size="sm" className="self-center" />

        <span className="flex shrink-0 flex-col items-end justify-center text-right">
          <span className="text-sm font-bold tabular-nums">{priceLabel(listing)}</span>
          <span className={cn("mt-0.5 text-xs font-bold", ship.tone)}>{ship.text}</span>
        </span>
      </Link>
    );
  }

  return (
    <Link href={href} className="group flex flex-col">
      <ProductShot className="mx-auto w-[92%] p-1.5 transition-transform duration-200 group-hover:-translate-y-[3px] sm:p-2">
        <WishlistButton productId={listing.id} size="sm" className="absolute right-2.5 top-2.5 z-10" />
        <BookJacket
          title={listing.title}
          author={listing.author}
          imageUrl={listing.coverImageUrl}
          from={listing.coverFrom}
          to={listing.coverTo}
          className="w-[86%]"
          // The jacket is ~80% of a grid column: 5 columns at lg, 3–4 at sm/md, 2 below.
          sizes="(min-width: 1024px) 240px, (min-width: 640px) 26vw, 42vw"
          priority={priority}
        />
      </ProductShot>

      <p className="mt-2 text-[15px] font-bold leading-[1.3] group-hover:underline">{listing.title}</p>
      <p className="text-[13px] text-ink-muted">{listing.author}</p>
      {rating && <p className="mt-1.5">{rating}</p>}
      <p className="mt-1 text-sm tabular-nums">{priceLabel(listing)}</p>
      <p className={cn("mt-0.5 text-xs font-bold", ship.tone)}>{ship.text}</p>
    </Link>
  );
}
