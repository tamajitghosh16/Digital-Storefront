"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, Plus } from "lucide-react";
import { cn } from "@repo/ui/utils";
import { buttonClass } from "@/components/primitives";
import { formatINRWhole } from "@/lib/format";
import { useCartStore, type CartItem } from "@/lib/cart-store";
import { tierForQuantity, tierUnitCents, type ClassSetTierConfig } from "@/lib/pricing";

/**
 * The book page's format picker and buy buttons.
 *
 * Formats are a multi-select, not a radio: a reader can take two paperbacks,
 * a hardcover and the e-book in one go, and each picked format becomes its
 * own cart line. The page decides which formats to offer — every edition
 * the book is sold in, with `unavailable` set on one that's out of stock or
 * already owned; this component only handles picking and quantity.
 *
 * A printed copy's per-copy price (paperback or hardcover) still follows
 * the admin's class-set tiers, because checkout prices it that way — the
 * cart must quote what will be charged. An e-book is one copy, always.
 */
const LOW_STOCK_THRESHOLD = 10;
const MAX_QTY = 99;

export type BookFormatKind = "paperback" | "hardcover" | "ebook";

export interface BookFormatOffer {
  kind: BookFormatKind;
  /** Cart/checkout line id — `<productId>:paperback`, `<productId>:hardcover` or `<productId>:ebook`. */
  lineId: string;
  priceCents: number;
  /** One line under the name: delivery time, "available instantly". */
  detail: string;
  /** Printed copies on hand. `null` = not tracked (never caps or warns). */
  stockQty: number | null;
  /** Set when the format is shown but can't be picked — "Coming soon", "Already in your library". */
  unavailable?: string;
}

const LABELS: Record<BookFormatKind, string> = {
  paperback: "Paperback",
  hardcover: "Hardcover",
  ebook: "E-book",
};

export function BookPurchase({
  title,
  offers,
  tiers,
  isSignedIn,
}: {
  title: string;
  offers: BookFormatOffer[];
  /** Admin-managed class-set tiers — the only pricing rule a printed line needs here. */
  tiers: ClassSetTierConfig[];
  isSignedIn: boolean;
}) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  const purchasable = offers.filter((offer) => !offer.unavailable);
  // kind → quantity, for the formats currently picked. Starts on the first
  // one that can be bought, so a single-format title is one click to buy.
  const [picked, setPicked] = useState<Partial<Record<BookFormatKind, number>>>(() =>
    purchasable[0] ? { [purchasable[0].kind]: 1 } : {}
  );
  const [added, setAdded] = useState(false);

  function maxQty(offer: BookFormatOffer): number {
    if (offer.kind === "ebook") return 1;
    return offer.stockQty !== null ? Math.min(offer.stockQty, MAX_QTY) : MAX_QTY;
  }

  function unitCents(offer: BookFormatOffer, quantity: number): number {
    if (offer.kind === "ebook") return offer.priceCents;
    return tierUnitCents(offer.priceCents, tierForQuantity(tiers, quantity).discount);
  }

  function toggle(kind: BookFormatKind) {
    setPicked((current) => {
      const next = { ...current };
      if (next[kind]) delete next[kind];
      else next[kind] = 1;
      return next;
    });
  }

  function setQuantity(offer: BookFormatOffer, quantity: number) {
    setPicked((current) => ({ ...current, [offer.kind]: Math.min(Math.max(1, quantity), maxQty(offer)) }));
  }

  const lines = purchasable.flatMap((offer) => {
    const quantity = picked[offer.kind];
    return quantity ? [{ offer, quantity, unit: unitCents(offer, quantity) }] : [];
  });
  const totalCents = lines.reduce((sum, line) => sum + line.unit * line.quantity, 0);

  function cartItems(): CartItem[] {
    return lines.map(({ offer, quantity, unit }) =>
      offer.kind === "ebook"
        ? {
            productId: offer.lineId,
            title: `${title} — e-book`,
            priceCents: unit,
            quantity: 1,
            fulfillmentType: "DIGITAL",
            taxType: "EBOOK",
            note: offer.detail,
            stockQty: null,
          }
        : {
            productId: offer.lineId,
            title,
            priceCents: unit,
            quantity,
            fulfillmentType: "SHIP",
            taxType: "PHYSICAL_BOOK",
            note: LABELS[offer.kind],
            stockQty: offer.stockQty,
          }
    );
  }

  function handleAdd() {
    if (!lines.length) return;
    cartItems().forEach(addItem);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    if (!lines.length) return;
    cartItems().forEach(addItem);
    router.push(isSignedIn ? "/cart" : "/sign-in?next=/cart");
  }

  return (
    <div>
      <div
        role="group"
        aria-label="Choose formats"
        className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2 xl:grid-cols-3"
      >
        {offers.map((offer) => {
          const quantity = picked[offer.kind];
          const selected = Boolean(quantity) && !offer.unavailable;
          const lowStock =
            !offer.unavailable && offer.stockQty !== null && offer.stockQty <= LOW_STOCK_THRESHOLD;
          const showStepper = selected && offer.kind !== "ebook";
          return (
            <div
              key={offer.kind}
              className={cn(
                "flex flex-col rounded-btn transition",
                offer.unavailable
                  ? "bg-tile inset-ring inset-ring-line"
                  : selected
                    ? "bg-brand-soft inset-ring-2 inset-ring-brand"
                    : "bg-ground inset-ring-2 inset-ring-line-strong hover:inset-ring-ink"
              )}
            >
              <button
                type="button"
                aria-pressed={selected}
                disabled={Boolean(offer.unavailable)}
                onClick={() => toggle(offer.kind)}
                className="flex w-full flex-col gap-1 rounded-btn px-4 pb-3 pt-3.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed"
              >
                <span className="flex w-full items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    {!offer.unavailable && (
                      <span
                        aria-hidden
                        className={cn(
                          "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full",
                          selected ? "bg-brand text-on-brand" : "inset-ring-2 inset-ring-line-strong"
                        )}
                      >
                        {selected && <Check className="h-3 w-3" strokeWidth={3.5} />}
                      </span>
                    )}
                    <strong className={cn("text-[15px]", offer.unavailable && "text-ink-subtle")}>
                      {LABELS[offer.kind]}
                    </strong>
                  </span>
                  <span
                    className={cn(
                      "whitespace-nowrap text-[15px] font-bold tabular-nums",
                      offer.unavailable && "text-ink-subtle"
                    )}
                  >
                    {formatINRWhole(offer.priceCents)}
                  </span>
                </span>
                <small className="block text-xs text-ink-muted">{offer.unavailable ?? offer.detail}</small>
              </button>

              {(lowStock || showStepper) && (
                <div className="flex min-h-9 items-center justify-between gap-2 px-4 pb-3">
                  {lowStock ? (
                    <span className="text-xs font-bold text-sale">Only {offer.stockQty} remaining</span>
                  ) : (
                    <span />
                  )}
                  {showStepper && (
                    <div className="inline-flex items-center overflow-hidden rounded-full bg-ground inset-ring inset-ring-line-strong">
                      <button
                        type="button"
                        aria-label={`Fewer ${LABELS[offer.kind].toLowerCase()} copies`}
                        disabled={quantity! <= 1}
                        onClick={() => setQuantity(offer, quantity! - 1)}
                        className="grid h-7 w-7 place-items-center hover:bg-tile disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Minus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                      <span className="min-w-7 text-center text-sm font-bold tabular-nums" aria-live="polite">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`More ${LABELS[offer.kind].toLowerCase()} copies`}
                        disabled={quantity! >= maxQty(offer)}
                        onClick={() => setQuantity(offer, quantity! + 1)}
                        className="grid h-7 w-7 place-items-center hover:bg-tile disabled:opacity-40 disabled:hover:bg-transparent"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-sm text-ink-muted" aria-live="polite">
        {purchasable.length === 0 ? (
          "This title is currently unavailable."
        ) : lines.length ? (
          <>
            Total <span className="text-[17px] font-bold tabular-nums text-ink">{formatINRWhole(totalCents)}</span>
            {" · inclusive of all taxes"}
          </>
        ) : (
          "Pick at least one format."
        )}
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleBuyNow}
          disabled={!lines.length}
          className={buttonClass("secondary", "md", "min-w-[150px] flex-1 sm:flex-none disabled:opacity-40")}
        >
          Buy now
        </button>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!lines.length}
          className={buttonClass("primary", "md", "min-w-[150px] flex-1 sm:flex-none")}
        >
          {added ? "Added to cart ✓" : "Add to cart"}
        </button>
      </div>
    </div>
  );
}
