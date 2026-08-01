import { FREE_DELIVERY_COPY } from "@/lib/pricing";

/**
 * The offer marquee. Pauses on hover so a line can actually be read, and
 * under `prefers-reduced-motion` it stops scrolling and simply shows the
 * offers from the start of the strip.
 *
 * The free-delivery line is read from lib/pricing so the threshold can't
 * drift away from what the cart actually charges.
 */
const OFFERS = [
  "Buy More, Read More! Flat 20% OFF when you take the print + e-book bundle",
  FREE_DELIVERY_COPY,
  "Class sets from 30 copies — up to 24% off",
  "25% of every sale funds the Sashibhusan Book Press Memorial Trust",
];

export function PromoBar() {
  return (
    <div className="group overflow-hidden bg-promo text-promo-ink" role="region" aria-label="Current offers">
      <p className="inline-flex animate-marquee gap-12 whitespace-nowrap py-[11px] pl-[100%] text-sm font-bold group-hover:[animation-play-state:paused] motion-reduce:animate-none motion-reduce:pl-4">
        {/* Repeated once so the tail of the loop is never blank. */}
        {[...OFFERS, OFFERS[0]].map((offer, i) => (
          <span key={i}>{offer}</span>
        ))}
      </p>
    </div>
  );
}
