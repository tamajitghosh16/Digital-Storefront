import { Callout, Stars } from "@/components/primitives";

/**
 * The reviews block on a product page: the average, the star distribution,
 * and the stub note. Rendered under each page's own "Reviews" heading; with
 * no rating yet it's just the empty line.
 */
export function ReviewSummary({
  rating,
  reviewCount,
  emptyLabel,
}: {
  rating?: number;
  reviewCount?: number;
  /** "No reviews for this title yet." */
  emptyLabel: string;
}) {
  if (typeof rating !== "number") return <p className="mt-3 text-[15px] text-ink-muted">{emptyLabel}</p>;

  const distribution = reviewDistribution(rating);
  return (
    <>
      <div className="mt-4 flex flex-wrap items-start gap-9">
        <div className="shrink-0">
          <p className="text-[52px] font-bold leading-none tracking-[-0.04em] tabular-nums">{rating.toFixed(1)}</p>
          <Stars rating={rating} className="mt-2 block text-[15px]" />
          <p className="mt-1.5 text-sm tabular-nums text-ink-muted">{reviewCount ?? 0} reviews</p>
        </div>

        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          {distribution.map((share, index) => (
            <div key={index} className="grid grid-cols-[46px_1fr_42px] items-center gap-3 text-[13px] text-ink-muted">
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
          <code className="rounded bg-ground px-1.5 py-0.5 font-mono text-[0.88em]">Review</code> model exists, the
          submission flow doesn&rsquo;t yet. The distribution above is derived from the title&rsquo;s average rating.
        </p>
      </div>
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
