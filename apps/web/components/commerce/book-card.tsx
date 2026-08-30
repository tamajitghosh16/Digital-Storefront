import Link from "next/link";
import { cn } from "@repo/ui/utils";
import { Stars } from "@/components/primitives";
import { formatINRWhole } from "@/lib/format";
import { BOOKS_BASE, type BookView } from "@/lib/books-query";
import type { BookListing } from "@/lib/books";
import { BookJacket, ProductShot } from "./book-jacket";

/**
 * One title in the books catalogue, in either a grid tile or a list row.
 *
 * The card is edition-agnostic by design: it shows the lower of the
 * printed and e-book price (prefixed "from" when both exist) and one
 * fulfilment line — the printed promise while stock lasts, otherwise the
 * digital one. Which edition to buy is chosen on the detail page.
 */

function priceLabel(listing: BookListing): string {
  const price = formatINRWhole(listing.fromPriceCents);
  return listing.hasPrint && listing.hasEbook ? `from ${price}` : price;
}

function fulfilment(listing: BookListing): { text: string; tone: string } {
  const stock = listing.stockQty ?? 0;
  if (listing.hasPrint && stock > 0) {
    if (stock <= 12) return { text: `Only ${stock} left`, tone: "text-warn" };
    if (stock >= 30) return { text: "Same-day delivery — Kolkata", tone: "text-ok" };
    return { text: "Ships in 2 days", tone: "text-ok" };
  }
  if (listing.hasEbook) return { text: "Instant download", tone: "text-ok" };
  return { text: "Currently unavailable", tone: "text-sale" };
}

export function BookCard({ listing, view }: { listing: BookListing; view: BookView }) {
  const href = `${BOOKS_BASE}/${listing.slug}`;
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
            coverImageUrl={listing.coverImageUrl}
            from={listing.coverFrom}
            to={listing.coverTo}
            sizes="70px"
          />
        </span>

        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px] font-bold leading-[1.3] group-hover:underline">{listing.title}</span>
          <span className="text-[13px] text-ink-muted">{listing.author}</span>
          {listing.genre && <span className="mt-0.5 text-xs text-ink-subtle">{listing.genre}</span>}
          {rating && <span className="mt-1.5">{rating}</span>}
        </span>

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
        <BookJacket
          title={listing.title}
          author={listing.author}
          coverImageUrl={listing.coverImageUrl}
          from={listing.coverFrom}
          to={listing.coverTo}
          className="w-[86%]"
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
