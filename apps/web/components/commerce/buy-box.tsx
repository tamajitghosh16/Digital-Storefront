"use client";
import { useMemo, useState } from "react";
import { cn } from "@repo/ui/utils";
import { Callout, CheckList, Rule, Stars, buttonClass } from "@/components/primitives";
import { formatINRWhole } from "@/lib/format";
import { useCartStore } from "@/lib/cart-store";
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
 */
export function BuyBox({
  productId,
  title,
  author,
  genre,
  rating,
  reviewCount,
  editions,
  printCents,
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
  supportsClassSets: boolean;
  /** Admin-managed delivery, bundle and class-set rules, loaded by the page. */
  pricing: PricingConfig;
}) {
  const addItem = useCartStore((state) => state.addItem);

  const [editionKind, setEditionKind] = useState(editions[0]?.kind ?? "print");
  const [quantity, setQuantity] = useState(1);
  const [speed, setSpeed] = useState<DeliverySpeed>("standard");
  const [added, setAdded] = useState(false);

  const speeds = useMemo(() => deliveryOptions(pricing), [pricing]);
  const edition = editions.find((candidate) => candidate.kind === editionKind) ?? editions[0];
  const digitalOnly = edition?.kind === "ebook";

  // Tiers are meaningless without a printed copy to discount.
  const tiersEnabled = supportsClassSets && printCents !== undefined && !digitalOnly;
  const effectiveQuantity = tiersEnabled ? quantity : 1;
  const tier = tierForQuantity(pricing.classSetTiers, effectiveQuantity);

  const printUnit = printCents !== undefined ? tierUnitCents(printCents, tier.discount) : 0;
  const unitCents = edition ? editionUnitCents(edition, printUnit) : 0;
  const totalCents = unitCents * effectiveQuantity;

  if (!edition) return null;

  function handleAdd() {
    addItem({
      productId: editionKind === "print" ? productId : `${productId}:${editionKind}`,
      title: editionKind === "print" ? title : `${title} — ${edition!.label.toLowerCase()}`,
      priceCents: unitCents,
      quantity: effectiveQuantity,
      fulfillmentType: editionKind === "ebook" ? "DIGITAL" : "SHIP",
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  }

  return (
    <div className="rounded-tile bg-ground p-[26px] inset-ring inset-ring-line">
      <h1 className="text-[30px]">{title}</h1>
      <p className="mt-2 text-sm text-ink-muted">
        {author}
        {genre && ` · ${genre}`}
      </p>
      {typeof rating === "number" && (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-ink-muted">
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

      <p className="text-4xl font-bold leading-none tracking-[-0.03em] tabular-nums">{formatINRWhole(totalCents)}</p>
      <p className="mt-[7px] text-sm text-ink-muted">
        MRP (inclusive of all taxes) ·{" "}
        {effectiveQuantity === 1
          ? "1 copy"
          : `${effectiveQuantity} copies at ${formatINRWhole(unitCents)} each`}
      </p>
      <p className="mt-2.5 text-sm font-bold text-ok">{edition.note}</p>

      <div className="mt-5 grid gap-2.5">
        <button type="button" onClick={handleAdd} className={buttonClass("primary", "lg", "w-full")}>
          {added ? "Added to cart ✓" : "Add to cart"}
        </button>
        <button type="button" className={buttonClass("secondary", "lg", "w-full")}>
          Buy now
        </button>
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
                const disabled = digitalOnly && candidate.quantity > 1;
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
                      {candidate.discount > 0 && !disabled ? `Save ${Math.round(candidate.discount * 100)}%` : " "}
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

/** Small bestseller/new pill used above the buy box's gallery. */
export function ShotFlag({ children }: { children: React.ReactNode }) {
  return <Callout className="absolute left-3 top-3">{children}</Callout>;
}
