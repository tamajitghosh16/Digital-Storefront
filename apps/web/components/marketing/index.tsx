import Image from "next/image";
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
        <div className="px-7 py-10 min-[900px]:px-12 min-[900px]:py-16">
          {eyebrow && <Callout className="max-w-[38ch]">{eyebrow}</Callout>}
          <h1 className="mb-3.5 mt-5">{title}</h1>
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

// ── Department bands ───────────────────────────────────────────────

/**
 * Five full-width homepage bands, one per business line, stacked one
 * after another rather than sharing a single repeated card template —
 * each shaped by what's actually different about that line (a mosaic of
 * classroom resources, one flagship product, a genuine either/or, two
 * pieces of software). Image areas are striped placeholders labelled
 * with what belongs there until real photography replaces them.
 */

export interface ProductLineItem {
  label: string;
  href: string;
}

/** The heading size these five bands share — bigger than the sitewide h2. */
const BAND_HEADING = "text-[32px] leading-[1.15] tracking-[-0.02em]";

/** Digital & Tech Solutions' teal and Lifestyle's green — the two accent
 *  pairs the mockup keeps from the storefront's own per-line palette. */
const TEAL = { border: "#0f8a95", from: "#e3f2f2", to: "#cfe6e6" };
const GREEN = { text: "#2f8b52", from: "#e6f2ea", to: "#d5e8db" };
const GOLD = "#b08600";

/** A striped stand-in for a product photo, labelled with what belongs there. */
function ImagePlaceholder({
  label,
  from,
  to,
  dark,
  align = "start",
  className,
}: {
  label: string;
  from?: string;
  to?: string;
  dark?: boolean;
  align?: "start" | "end";
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={cn("flex items-start p-4", align === "end" ? "justify-end text-right" : "justify-start", className)}
      style={{
        backgroundImage: dark
          ? "repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 14px, rgba(255,255,255,0.1) 14px 28px)"
          : `repeating-linear-gradient(45deg, ${from ?? "var(--color-tile)"} 0 14px, ${to ?? "var(--color-tile-2)"} 14px 28px)`,
      }}
    >
      <span className={cn("caps", dark ? "text-white/50" : "text-ink-subtle")}>{label}</span>
    </div>
  );
}

/** Fills a band's image slot with a real photo/illustration when a src is
 *  given, falling back to the striped placeholder otherwise. */
function BandImage({
  src,
  alt,
  label,
  from,
  to,
  dark,
  align,
  className,
  sizes = "(min-width: 860px) 50vw, 100vw",
}: {
  src?: string;
  alt: string;
  label: string;
  from?: string;
  to?: string;
  dark?: boolean;
  align?: "start" | "end";
  className?: string;
  sizes?: string;
}) {
  if (src) {
    return (
      <div className={cn("relative", className)}>
        <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
      </div>
    );
  }
  return <ImagePlaceholder label={label} from={from} to={to} dark={dark} align={align} className={className} />;
}

/** "Educational and Learning" — heading and CTA left, a staggered tile mosaic right. */
export function EducationalLearningBand({
  title,
  body,
  items,
  images = [],
  href = "/books",
}: {
  title: string;
  body: string;
  items: ProductLineItem[];
  images?: string[];
  href?: string;
}) {
  const [tall, ...rest] = items;
  const shotLabels = ["Chart photo", "Worksheet spread", "Teaching kit"];

  return (
    <section className="bg-page py-12 min-[860px]:py-16">
      <Wrap className="grid gap-8 min-[860px]:grid-cols-[minmax(0,320px)_1fr] min-[860px]:items-stretch min-[860px]:gap-10">
        <div className="flex flex-col justify-center">
          <h2 className={BAND_HEADING}>{title}</h2>
          <p className="mt-3 max-w-[38ch] text-[15px] leading-[1.6] text-ink-muted">{body}</p>
          <Link
            href={href}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-brand px-5 py-3 text-sm font-bold text-on-brand transition hover:bg-brand-press"
          >
            View all <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 min-[860px]:h-[440px]">
          {tall && (
            <Link
              href={tall.href}
              className="group relative row-span-2 flex h-[220px] flex-col overflow-hidden rounded-tile bg-tile inset-ring inset-ring-card-edge min-[860px]:h-full"
            >
              <BandImage
                src={images[0]}
                alt={tall.label}
                label={shotLabels[0] ?? "Product photo"}
                className="flex-1 items-start"
                sizes="(min-width: 860px) 320px, 50vw"
              />
              <span className="flex items-center justify-between gap-2 bg-ground px-4 py-3.5 text-sm font-bold">
                {tall.label}
                <span aria-hidden className="text-ink-subtle">
                  →
                </span>
              </span>
            </Link>
          )}
          {rest.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative flex h-[102px] flex-col overflow-hidden rounded-tile bg-tile inset-ring inset-ring-card-edge min-[860px]:h-full"
            >
              <BandImage
                src={images[i + 1]}
                alt={item.label}
                label={shotLabels[i + 1] ?? "Product photo"}
                className="flex-1 items-start"
                sizes="(min-width: 860px) 320px, 50vw"
              />
              <span className="flex items-center justify-between gap-2 bg-ground px-4 py-3 text-sm font-bold">
                {item.label}
                <span aria-hidden className="text-ink-subtle">
                  →
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

/** "Professional products" — navy spotlight card, copy left, product photo right.
 *  Contained to the page's 1280px measure like every other band, rather than
 *  breaking out to the viewport edge. */
export function ProfessionalProductsBand({
  title,
  body,
  item,
  image,
}: {
  title: string;
  body: string;
  item: ProductLineItem;
  image?: string;
}) {
  return (
    <Wrap as="section" className="py-12 min-[860px]:py-16">
      <div className="grid overflow-hidden rounded-tile bg-band text-band-ink min-[820px]:grid-cols-2 min-[820px]:items-stretch">
        <div className="px-7 py-10 min-[820px]:px-12 min-[820px]:py-14">
          <h2 className={cn(BAND_HEADING, "text-band-ink")}>{title}</h2>
          <p className="mt-2 text-[15px] font-bold text-band-feature">{item.label}</p>
          <p className="mt-3 max-w-[46ch] text-[15px] leading-[1.6] text-band-muted">{body}</p>
          <Link
            href={item.href}
            className="mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-band transition hover:bg-white/90"
          >
            {item.label} <span aria-hidden>→</span>
          </Link>
        </div>
        <div className="relative h-[240px] min-[820px]:h-auto">
          <BandImage
            src={image}
            alt={item.label}
            label="Diary photo"
            dark
            className="absolute inset-0 h-full"
            sizes="(min-width: 820px) 50vw, 100vw"
          />
        </div>
      </div>
    </Wrap>
  );
}

/** "Digital & Tech Solutions" — light band, two wide numbered panels with a screenshot beside the copy. */
export function DigitalTechBand({ title, body, items }: { title: string; body: string; items: ProductLineItem[] }) {
  const shotLabels = ["App screen", "Dashboard view"];

  return (
    <section className="bg-tile">
      <Wrap className="py-12 min-[860px]:py-16">
        <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between min-[760px]:gap-8">
          <h2 className={BAND_HEADING}>{title}</h2>
          <p className="max-w-[46ch] text-[15px] leading-[1.6] text-ink-muted min-[760px]:text-right">{body}</p>
        </div>

        <div className="mt-8 grid gap-5 min-[640px]:grid-cols-2">
          {items.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="group overflow-hidden rounded-tile border-t-4 bg-ground shadow-tile transition-transform hover:-translate-y-1"
              style={{ borderTopColor: TEAL.border }}
            >
              <div className="relative h-[170px]">
                <ImagePlaceholder
                  label={shotLabels[i] ?? "App screen"}
                  from={TEAL.from}
                  to={TEAL.to}
                  className="absolute inset-0 items-start"
                />
              </div>
              <div className="p-6">
                <span className="caps text-ink-subtle">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-2">{item.label}</h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-brand">
                  Learn more
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

/** "Publishing" — no imagery; large gold-numbered rows that indent on hover. */
export function PublishingBand({ title, body, items }: { title: string; body: string; items: ProductLineItem[] }) {
  return (
    <section className="bg-page py-12 min-[860px]:py-16">
      <Wrap>
        <div className="flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-end min-[760px]:justify-between min-[760px]:gap-8">
          <h2 className={BAND_HEADING}>{title}</h2>
          <p className="max-w-[46ch] text-[15px] leading-[1.6] text-ink-muted min-[760px]:text-right">{body}</p>
        </div>

        <div className="mt-8 border-t border-line">
          {items.map((item, i) => (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center justify-between gap-6 border-b border-line py-7 transition-transform hover:translate-x-3"
            >
              <span className="flex items-baseline gap-5">
                <span className="text-[26px] font-bold tabular-nums" style={{ color: GOLD }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[26px] font-bold tracking-[-0.02em] min-[640px]:text-[36px]">{item.label}</span>
              </span>
              <span
                aria-hidden
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line-strong text-lg text-ink-subtle transition group-hover:translate-x-1 group-hover:border-brand group-hover:text-brand"
              >
                →
              </span>
            </Link>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

/** "Lifestyle" — image band with a white copy panel overlaid, contained to the
 *  page's 1280px measure like every other band. */
export function LifestyleBand({
  title,
  body,
  item,
  image,
}: {
  title: string;
  body: string;
  item: ProductLineItem;
  image?: string;
}) {
  return (
    <Wrap as="section" className="py-12 min-[860px]:py-16">
      <div className="relative isolate h-[420px] overflow-hidden rounded-tile min-[760px]:h-[460px]">
        <BandImage
          src={image}
          alt={item.label}
          label="Wide plant photo"
          from={GREEN.from}
          to={GREEN.to}
          align="end"
          className="absolute inset-0 items-start"
          sizes="(min-width: 1280px) 1280px, 100vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent min-[760px]:bg-gradient-to-r min-[760px]:from-black/45 min-[760px]:via-black/5 min-[760px]:to-transparent"
        />
        <div className="absolute inset-x-4 bottom-4 max-w-[420px] rounded-tile bg-ground p-6 shadow-pop min-[760px]:inset-x-auto min-[760px]:bottom-6 min-[760px]:left-6 min-[760px]:p-8">
          <h2 className={BAND_HEADING}>{title}</h2>
          <p className="mt-2 text-[15px] font-bold" style={{ color: GREEN.text }}>
            {item.label}
          </p>
          <p className="mt-3 max-w-[40ch] text-[15px] leading-[1.6] text-ink-muted">{body}</p>
          <Link
            href={item.href}
            className="mt-5 inline-flex w-fit items-center gap-2 rounded-full px-5 py-3 text-sm font-bold text-white transition hover:brightness-90"
            style={{ backgroundColor: GREEN.text }}
          >
            {item.label} <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </Wrap>
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
