import Link from "next/link";
import { cn } from "@repo/ui/utils";
import { Callout, Wrap, buttonClass } from "@/components/primitives";
import { BookJacket } from "@/components/commerce/book-jacket";

/**
 * The repeating marketing blocks: hero, category circles, trust band,
 * the dark author-services band, and the newsletter. Each takes its
 * content as props so the pages that use them stay declarative and the
 * CMS-backed copy keeps flowing in from the database.
 */

// ── Hero ────────────────────────────────────────────────────────────

export interface HeroJacket {
  title: string;
  author: string;
  from?: string;
  to?: string;
}

export function Hero({
  eyebrow,
  title,
  standfirst,
  primary,
  secondary,
  jackets,
}: {
  eyebrow?: string;
  title: string;
  standfirst: string;
  primary?: { label: string; href: string };
  secondary?: { label: string; href: string };
  jackets: HeroJacket[];
}) {
  // Fanned like a hand of cards rather than laid out in a row.
  const fan = [
    "left-[6%] top-[22%] w-[150px] -rotate-[10deg] z-[1]",
    "left-[28%] top-[14%] w-[150px] -rotate-3 z-[2]",
    "left-[50%] top-[8%] w-[168px] rotate-[4deg] z-[3]",
    "left-[72%] top-[20%] w-[150px] rotate-[11deg] z-[2]",
  ];

  return (
    <Wrap as="section" className="pt-6">
      <div className="grid items-center overflow-hidden rounded-tile bg-tile bg-[linear-gradient(135deg,var(--color-tile-3)_0%,var(--color-tile)_58%,var(--color-brand-soft)_100%)] min-[900px]:grid-cols-2">
        <div className="px-7 py-10 min-[900px]:px-12 min-[900px]:py-14">
          {eyebrow && <Callout>{eyebrow}</Callout>}
          <h1 className="mb-3.5 mt-4">{title}</h1>
          <p className="max-w-[40ch] text-[17px] leading-[1.55] text-ink-muted">{standfirst}</p>
          {(primary || secondary) && (
            <div className="mt-[26px] flex flex-wrap gap-3">
              {primary && (
                <Link href={primary.href} className={buttonClass("primary", "lg")}>
                  {primary.label}
                </Link>
              )}
              {secondary && (
                <Link href={secondary.href} className={buttonClass("secondary", "lg")}>
                  {secondary.label}
                </Link>
              )}
            </div>
          )}
        </div>

        <div aria-hidden className="relative hidden min-h-[400px] min-[900px]:block">
          {jackets.slice(0, 4).map((jacket, i) => (
            <BookJacket
              key={`${jacket.title}-${i}`}
              title={jacket.title}
              author={jacket.author}
              from={jacket.from}
              to={jacket.to}
              className={cn("absolute", fan[i])}
              sizes="168px"
              priority={i === 2}
            />
          ))}
        </div>
      </div>
    </Wrap>
  );
}

// ── Category circles ────────────────────────────────────────────────

export interface CategoryCircle {
  label: string;
  href: string;
  glyph: string;
  from: string;
  to: string;
}

export function CategoryCircles({ categories }: { categories: CategoryCircle[] }) {
  return (
    <div className="flex gap-5 overflow-x-auto pb-2.5">
      {categories.map((category) => (
        <Link key={category.label} href={category.href} className="group w-[116px] shrink-0 text-center">
          <span
            className="mb-2.5 grid h-[116px] w-[116px] place-items-center rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
            style={{ backgroundImage: `linear-gradient(155deg, ${category.from}, ${category.to})` }}
          >
            <span aria-hidden className="text-[40px] leading-none text-white">
              {category.glyph}
            </span>
          </span>
          <span className="block text-[13px] font-bold leading-[1.25] group-hover:underline">{category.label}</span>
        </Link>
      ))}
    </div>
  );
}

// ── Trust band ──────────────────────────────────────────────────────

export interface TrustItem {
  title: string;
  body: string;
}

/**
 * The glyphs stay in code. They're chosen to sit correctly at this size and
 * weight, and picking one isn't a job to hand a non-technical editor — the
 * wording beside them is what the admin controls.
 */
const TRUST_GLYPHS = ["▤", "↺", "₹"];

export function TrustBand({ items }: { items: TrustItem[] }) {
  return (
    <div className="bg-tile">
      <Wrap className="grid gap-[26px] py-[34px] [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        {items.map((item, index) => (
          <div key={item.title} className="flex items-start gap-3.5">
            <span aria-hidden className="text-[22px] leading-[1.1]">
              {TRUST_GLYPHS[index % TRUST_GLYPHS.length]}
            </span>
            <div>
              <h4>{item.title}</h4>
              <p className="mt-1 text-sm text-ink-muted">{item.body}</p>
            </div>
          </div>
        ))}
      </Wrap>
    </div>
  );
}

// ── Dark band with plan cards ───────────────────────────────────────

export interface BandPlan {
  /** Rendered as a pill above the title — a step number or "Most popular". */
  tag?: string;
  title: string;
  price?: string;
  meta?: string;
  points: string[];
  cta?: { label: string; href: string };
  featured?: boolean;
}

export function PlanBand({
  eyebrow,
  title,
  standfirst,
  plans,
}: {
  eyebrow: string;
  title: string;
  standfirst: string;
  plans: BandPlan[];
}) {
  return (
    <section className="bg-band py-14 text-band-ink">
      <Wrap>
        <Callout>{eyebrow}</Callout>
        <h2 className="mt-3.5 text-[32px]">{title}</h2>
        <p className="mt-3 max-w-[54ch] text-[17px] leading-[1.55] text-band-muted">{standfirst}</p>

        <div className="mt-8 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(256px,1fr))]">
          {plans.map((plan) => (
            <div
              key={plan.title}
              className={cn(
                "flex flex-col rounded-tile p-6",
                plan.featured
                  ? "bg-band-feature text-band-feature-ink"
                  : "bg-band-plan inset-ring inset-ring-band-plan-edge"
              )}
            >
              {plan.tag && (
                <span
                  className={cn(
                    "caps mb-2.5 inline-flex w-fit items-center rounded-full px-2.5 py-[3px]",
                    plan.featured ? "bg-band-button text-band-button-ink" : "bg-band-plan-edge text-band-ink"
                  )}
                >
                  {plan.tag}
                </span>
              )}
              <h3>{plan.title}</h3>
              {plan.price && (
                <p className="mt-2.5 text-[30px] font-bold tracking-[-0.03em] tabular-nums">{plan.price}</p>
              )}
              {plan.meta && (
                <p className={cn("mt-1 text-[13px]", plan.featured ? "text-band-feature-muted" : "text-band-muted")}>
                  {plan.meta}
                </p>
              )}

              <ul className="mb-[22px] mt-[18px] flex flex-1 flex-col gap-2.5">
                {plan.points.map((point) => (
                  <li key={point} className="relative pl-[22px] text-sm leading-[1.4]">
                    <span aria-hidden className="absolute left-0 font-bold">
                      ✓
                    </span>
                    {point}
                  </li>
                ))}
              </ul>

              {plan.cta && (
                <Link
                  href={plan.cta.href}
                  className={cn(
                    "inline-flex items-center justify-center rounded-btn border-2 px-4 py-3 text-base font-bold transition",
                    plan.featured
                      ? "border-band-button bg-band-button text-band-button-ink hover:brightness-150"
                      : "border-current text-band-ink hover:bg-white/10"
                  )}
                >
                  {plan.cta.label}
                </Link>
              )}
            </div>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

// ── Newsletter ──────────────────────────────────────────────────────

export function Newsletter({
  title,
  body,
  placeholder,
  buttonLabel,
}: {
  title: string;
  body: string;
  placeholder: string;
  buttonLabel: string;
}) {
  return (
    <section className="bg-brand py-11 text-on-brand">
      <Wrap>
        <h2 className="text-[28px]">{title}</h2>
        <p className="mt-2.5 max-w-[52ch] text-base leading-[1.55]">{body}</p>
        {/* No mailing-list backend in this scaffold yet — wiring it up means
            an inngest.send() from a Server Action (packages/jobs). */}
        <form className="mt-5 flex max-w-[520px] flex-wrap gap-2.5">
          <label htmlFor="newsletter-email" className="sr-only">
            Email address
          </label>
          <input
            id="newsletter-email"
            type="email"
            required
            placeholder={placeholder}
            className="h-[50px] min-w-[210px] flex-1 rounded-full border-2 border-on-brand bg-ground px-5 text-ink focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-btn border-2 border-on-brand bg-on-brand px-4 py-3 text-base font-bold text-brand transition hover:brightness-95"
          >
            {buttonLabel}
          </button>
        </form>
      </Wrap>
    </section>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────

export function FaqList({ items }: { items: { id: string; question: string; answer: string }[] }) {
  return (
    <div className="max-w-[780px]">
      {items.map((item, index) => (
        <details key={item.id} open={index === 0} className="group border-b border-line">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-1 py-[18px] text-[17px] font-bold tracking-[-0.01em] marker:content-['']">
            {item.question}
            <span aria-hidden className="text-[22px] font-normal text-ink-muted group-open:hidden">
              +
            </span>
            <span aria-hidden className="hidden text-[22px] font-normal text-ink-muted group-open:block">
              –
            </span>
          </summary>
          <p className="max-w-[70ch] px-1 pb-5 text-[15px] leading-[1.6] text-ink-muted">{item.answer}</p>
        </details>
      ))}
    </div>
  );
}

// ── Returns promise ─────────────────────────────────────────────────

export function ReturnsBand() {
  return (
    <div className="mt-9 flex flex-wrap items-center gap-[18px] rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
      <span aria-hidden className="text-[26px]">
        ↺
      </span>
      <div className="min-w-[220px] flex-1">
        <h3>Easy Returns: Free Replacement or Full Refund</h3>
        <p className="mt-1.5 text-sm text-ink-muted">
          If a book arrives damaged or isn&rsquo;t what you expected, tell us within seven days.
        </p>
      </div>
      <Link href="/services" className={buttonClass("secondary")}>
        Read the guarantee
      </Link>
    </div>
  );
}
