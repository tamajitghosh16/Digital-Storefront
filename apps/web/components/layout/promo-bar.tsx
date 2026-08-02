import { freeDeliveryCopy, type PricingConfig } from "@/lib/pricing";

/**
 * The offer marquee. Pauses on hover so a line can actually be read, and
 * under `prefers-reduced-motion` it stops scrolling and simply shows the
 * offers from the start of the strip.
 *
 * Every claim that quotes a number is derived from the admin-managed pricing
 * rules rather than typed out here, so the strip can't end up advertising a
 * discount the cart no longer gives.
 */
export function PromoBar({ pricing }: { pricing: PricingConfig }) {
  const bestTier = pricing.classSetTiers.reduce(
    (best, tier) => (tier.discount > best.discount ? tier : best),
    { quantity: 0, discount: 0 }
  );

  const offers = [
    "Buy More, Read More! Take the print + e-book bundle and save on the pair",
    freeDeliveryCopy(pricing),
    bestTier.discount > 0
      ? `Class sets from ${bestTier.quantity} copies — up to ${Math.round(bestTier.discount * 100)}% off`
      : null,
    "25% of every sale funds the Sashibhusan Book Press Memorial Trust",
  ].filter((offer): offer is string => Boolean(offer));

  return (
    <div className="group overflow-hidden bg-promo text-promo-ink" role="region" aria-label="Current offers">
      <p className="inline-flex animate-marquee gap-12 whitespace-nowrap py-[11px] pl-[100%] text-sm font-bold group-hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:pl-4">
        {/* Repeated once so the tail of the loop is never blank. */}
        {[...offers, offers[0]].map((offer, i) => (
          <span key={i}>{offer}</span>
        ))}
      </p>
    </div>
  );
}
