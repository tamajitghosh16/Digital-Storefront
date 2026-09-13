"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { createClient } from "@repo/auth/client";
import { cn } from "@repo/ui/utils";
import { CheckList, Rule, Stars, buttonClass } from "@/components/primitives";
import { formatINRWhole } from "@/lib/format";
import { useCartStore, type CartItem } from "@/lib/cart-store";
import { WishlistButton } from "./wishlist-button";
import {
  deliveryOptions,
  editionUnitCents,
  freeDeliveryCopy,
  tierForQuantity,
  tierUnitCents,
  type DeliverySpeed,
  type Edition,
  type PricingConfig,
} from "@/lib/pricing";

/**
 * The product page's configure-and-buy panel.
 *
 * Edition and quantity interact: class-set tiers price the *printed*
 * copy, the bundle adds a flat amount on top of whatever the printed
 * copy costs at that tier, and a digital-only selection has no tiers at
 * all because there is nothing to print. Keeping that arithmetic in one
 * place is why this is a single component rather than three.
 *
 * Stock only constrains editions that ship a physical copy (`print` and
 * `both`). When `stockQty` is a known number it caps the quantity, drives
 * the low-stock nudge (< 10 left), and — at zero — disables ordering
 * entirely. A null/undefined `stockQty` means "not tracked", so nothing
 * is blocked (e-books, service rows, un-migrated catalogue rows).
 */
const LOW_STOCK_THRESHOLD = 10;
const MAX_QTY = 99;

export function BuyBox({
  productId,
  title,
  author,
  genre,
  rating,
  reviewCount,
  editions,
  printCents,
  stockQty,
  supportsClassSets,
  pricing,
}: {
  productId: string;
  title: string;
  author: string;
  genre?: string;
  rating?: number;
  reviewCount?: number;
  editions: Edition[];
  /** Single-copy printed price — the base every tier is derived from. */
  printCents?: number;
  /** Units of the printed edition on hand. `null`/`undefined` = not tracked. */
  stockQty?: number | null;
  supportsClassSets: boolean;
  /** Admin-managed delivery, bundle and class-set rules, loaded by the page. */
  pricing: PricingConfig;
}) {
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);

  // Payment requires a signed-in account (so e-books can be tied to it). We
  // check on the client to avoid threading the flag through every page that
  // renders a buy box; the checkout Server Action re-checks server-side.
  // Default true so the primary CTA never flashes as blocked before the
  // check resolves.
  const [isSignedIn, setIsSignedIn] = useState(true);
  useEffect(() => {
    let active = true;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active) setIsSignedIn(Boolean(data.session));
      })
      .catch(() => {
        if (active) setIsSignedIn(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const [editionKind, setEditionKind] = useState(editions[0]?.kind ?? "print");
  const [quantity, setQuantity] = useState(1);
  const [speed, setSpeed] = useState<DeliverySpeed>("standard");
  const [added, setAdded] = useState(false);

  const speeds = useMemo(() => deliveryOptions(pricing), [pricing]);
  const edition = editions.find((candidate) => candidate.kind === editionKind) ?? editions[0];
  const digitalOnly = edition?.kind === "ebook";

  // Physical stock only matters for editions that ship something.
  const knownStock = typeof stockQty === "number";
  const physicalSelected = !digitalOnly;
  const outOfStock = physicalSelected && knownStock && (stockQty as number) <= 0;
  const lowStock =
    physicalSelected && knownStock && (stockQty as number) > 0 && (stockQty as number) < LOW_STOCK_THRESHOLD;
  const maxQty = digitalOnly
    ? 1
    : knownStock && (stockQty as number) > 0
      ? Math.min(stockQty as number, MAX_QTY)
      : MAX_QTY;

  const effectiveQuantity = Math.min(Math.max(1, quantity), maxQty);
  const tier = tierForQuantity(pricing.classSetTiers, effectiveQuantity);

  const printUnit = printCents !== undefined ? tierUnitCents(printCents, tier.discount) : 0;
  const unitCents = edition ? editionUnitCents(edition, printUnit) : 0;
  const totalCents = unitCents * effectiveQuantity;

  if (!edition) return null;

  function buildItem(): CartItem {
    return {
      productId: editionKind === "print" ? productId : `${productId}:${editionKind}`,
      title: editionKind === "print" ? title : `${title} — ${edition!.label.toLowerCase()}`,
      priceCents: unitCents,
      quantity: effectiveQuantity,
      fulfillmentType: editionKind === "ebook" ? "DIGITAL" : "SHIP",
      taxType: editionKind === "ebook" ? "EBOOK" : "PHYSICAL_BOOK",
      stockQty: physicalSelected ? (stockQty ?? null) : null,
    };
  }

  function handleAdd() {
    if (outOfStock) return;
    addItem(buildItem());
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  function handleBuyNow() {
    if (outOfStock) return;
    addItem(buildItem());
    router.push(isSignedIn ? "/cart" : "/sign-in?next=/cart");
  }

  return (
    <div className="rounded-tile bg-ground p-[26px] inset-ring inset-ring-line">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[22px] font-bold leading-[1.15] tracking-[-0.02em]">{title}</p>
        <WishlistButton productId={productId} className="mt-0.5" />
      </div>
      <p className="mt-1.5 text-sm text-ink-muted">
        {author}
        {genre && ` · ${genre}`}
      </p>
      {typeof rating === "number" && (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ink-muted">
          <Stars rating={rating} />
          <span className="tabular-nums">
            {rating.toFixed(1)}
            {typeof reviewCount === "number" && ` (${reviewCount} reviews)`}
          </span>
        </p>
      )}

      <Rule />

      <p className="caps mb-2.5 text-ink-muted">Choose an edition</p>
      <div className="grid gap-2.5">
        {editions.map((option) => {
          const selected = option.kind === editionKind;
          return (
            <button
              key={option.kind}
              type="button"
              aria-pressed={selected}
              onClick={() => setEditionKind(option.kind)}
              className={cn(
                "flex w-full items-center justify-between gap-3.5 rounded-btn px-4 py-3.5 text-left transition",
                selected
                  ? "bg-brand text-on-brand inset-ring-[3px] inset-ring-ink"
                  : "bg-ground inset-ring-2 inset-ring-line-strong hover:inset-ring-ink"
              )}
            >
              <span>
                <strong className="text-[15px]">{option.label}</strong>
                <small className={cn("mt-0.5 block text-xs", selected ? "opacity-[0.78]" : "text-ink-muted")}>
                  {option.detail}
                </small>
              </span>
              <span className="whitespace-nowrap text-base font-bold tabular-nums">
                {formatINRWhole(option.priceCents)}
              </span>
            </button>
          );
        })}
      </div>

      {!digitalOnly && (
        <>
          <Rule />
          <div className="flex flex-col gap-[7px]">
            <label htmlFor="delivery-speed" className="caps text-ink-muted">
              Delivery speed
            </label>
            <select
              id="delivery-speed"
              value={speed}
              onChange={(event) => setSpeed(event.target.value as DeliverySpeed)}
              className="h-12 rounded-btn border-2 border-line-strong bg-ground px-3.5 text-[15px] focus:border-ink focus:outline-none"
            >
              {speeds.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      <Rule />

      <div className="flex items-center justify-between gap-3">
        <span className="caps text-ink-muted">Quantity</span>
        <div className="inline-flex items-center overflow-hidden rounded-full bg-tile">
          <button
            type="button"
            aria-label="Decrease quantity"
            disabled={digitalOnly || outOfStock || effectiveQuantity <= 1}
            onClick={() => setQuantity((current) => Math.max(1, Math.min(current, maxQty) - 1))}
            className="grid h-[34px] w-[34px] place-items-center hover:bg-tile-2 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Minus className="h-4 w-4" strokeWidth={2.5} />
          </button>
          <span className="min-w-10 text-center text-sm font-bold tabular-nums">{effectiveQuantity}</span>
          <button
            type="button"
            aria-label="Increase quantity"
            disabled={digitalOnly || outOfStock || effectiveQuantity >= maxQty}
            onClick={() => setQuantity((current) => Math.min(maxQty, Math.max(1, current) + 1))}
            className="grid h-[34px] w-[34px] place-items-center hover:bg-tile-2 disabled:opacity-40 disabled:hover:bg-transparent"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      <Rule />

      <p className="text-4xl font-bold leading-none tracking-[-0.03em] tabular-nums">{formatINRWhole(totalCents)}</p>
      <p className="mt-[7px] text-sm text-ink-muted">
        MRP (inclusive of all taxes) ·{" "}
        {effectiveQuantity === 1
          ? "1 copy"
          : `${effectiveQuantity} copies at ${formatINRWhole(unitCents)} each`}
      </p>
      {outOfStock ? (
        <p className="mt-2.5 text-sm font-bold text-sale">Out of stock</p>
      ) : (
        <>
          <p className="mt-2.5 text-sm font-bold text-ok">{edition.note}</p>
          {lowStock && (
            <p className="mt-1 text-sm font-bold text-warn">Only {stockQty} left in stock</p>
          )}
        </>
      )}

      <div className="mt-5 grid gap-2.5">
        {outOfStock ? (
          <button type="button" disabled className={buttonClass("primary", "lg", "w-full")}>
            Out of stock
          </button>
        ) : (
          <>
            <button type="button" onClick={handleAdd} className={buttonClass("primary", "lg", "w-full")}>
              {added ? "Added to cart ✓" : "Add to cart"}
            </button>
            <button type="button" onClick={handleBuyNow} className={buttonClass("secondary", "lg", "w-full")}>
              Buy now
            </button>
          </>
        )}
      </div>

      {supportsClassSets && printCents !== undefined && (
        <>
          <Rule />
          <details className="mt-0.5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-btn bg-tile px-3.5 py-3 text-sm font-bold marker:content-[''] hover:bg-tile-2">
              Buying for a class?
              <span className="text-sm font-normal tabular-nums text-ink-muted">
                {effectiveQuantity === 1 ? "Buy 1" : `Buy ${effectiveQuantity} · ${formatINRWhole(unitCents)} each`}
              </span>
            </summary>

            <div className="mt-3.5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(134px,1fr))]">
              {pricing.classSetTiers.map((candidate) => {
                const overStock = knownStock && !digitalOnly && candidate.quantity > (stockQty as number);
                const disabled = (digitalOnly && candidate.quantity > 1) || outOfStock || overStock;
                const selected = !disabled && candidate.quantity === effectiveQuantity;
                const each = tierUnitCents(printCents, candidate.discount);
                return (
                  <button
                    key={candidate.quantity}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => setQuantity(candidate.quantity)}
                    className={cn(
                      "rounded-btn px-3.5 py-3 text-left transition",
                      selected
                        ? "bg-brand text-on-brand inset-ring-[3px] inset-ring-ink"
                        : "bg-ground inset-ring-2 inset-ring-line-strong hover:inset-ring-ink",
                      disabled && "cursor-not-allowed opacity-40 hover:inset-ring-line-strong"
                    )}
                  >
                    <span className="caps block">Buy {candidate.quantity}</span>
                    <span className="mt-1 block text-lg font-bold tracking-[-0.02em] tabular-nums">
                      {disabled ? "—" : formatINRWhole(editionUnitCents(edition, each))}
                    </span>
                    <span className="mt-px block text-xs font-bold">
                      {candidate.discount > 0 && !disabled ? `Save ${Math.round(candidate.discount * 100)}%` : " "}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-3 text-sm text-ink-muted">
              {digitalOnly
                ? "Class-set pricing applies to printed copies only."
                : "Class-set pricing applies to the printed copy."}
            </p>
          </details>
        </>
      )}

      <Rule />

      <CheckList
        items={[
          freeDeliveryCopy(pricing),
          "Easy returns — free replacement or full refund",
          "Five downloads per e-book format",
          "25% of this sale funds the Sashibhusan Book Press Memorial Trust",
        ]}
      />

      {speed !== "standard" && (
        <p className="mt-4 text-xs text-ink-subtle">
          Delivery is charged at checkout; orders over {formatINRWhole(pricing.delivery.freeOverCents)} ship free on
          standard speed.
        </p>
      )}
    </div>
  );
}
