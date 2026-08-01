import Link from "next/link";
import { cn } from "@repo/ui/utils";

/**
 * Storefront presentation primitives.
 *
 * These are the small, style-only pieces the approved design repeats
 * everywhere — the pill callout, the section head, the page measure.
 * They live here rather than in `@repo/ui` because they carry this
 * storefront's identity; `@repo/ui` holds the behavioural primitives
 * (Button, Sheet, DropdownMenu) that apps/admin shares.
 */

/** The design's 1280px measure with its 16/24px gutters. */
export function Wrap({
  children,
  className,
  as: Tag = "div",
  ...rest
}: React.HTMLAttributes<HTMLElement> & {
  children: React.ReactNode;
  as?: "div" | "section" | "nav" | "header" | "footer";
}) {
  return (
    <Tag className={cn("mx-auto w-full max-w-[1280px] px-4 md:px-6", className)} {...rest}>
      {children}
    </Tag>
  );
}

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 rounded-btn border-2 border-transparent font-bold leading-[1.25] transition-colors focus-visible:outline-none disabled:cursor-not-allowed";

const BUTTON_SIZES = {
  sm: "px-3.5 py-2.5 text-sm",
  md: "px-4 py-3 text-base",
  lg: "px-6.5 py-[15px] text-[17px]",
} as const;

const BUTTON_VARIANTS = {
  primary: "bg-brand text-on-brand hover:bg-brand-press disabled:bg-tile-2 disabled:text-ink-subtle",
  secondary: "border-ink bg-ground text-ink hover:bg-tile",
  tertiary: "bg-tile text-ink hover:bg-tile-2",
  /** For tinted grounds where a filled tertiary button disappears. */
  ghost: "border-line-strong text-ink hover:border-ink hover:bg-tile-2",
} as const;

export type ButtonVariant = keyof typeof BUTTON_VARIANTS;
export type ButtonSize = keyof typeof BUTTON_SIZES;

/**
 * Class string rather than a component, so it drops onto a `<button>`, an
 * `<a>`, a `next/link` or `@repo/ui`'s `<Button className>` without
 * adding another wrapper to the tree.
 */
export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string
) {
  return cn(BUTTON_BASE, BUTTON_SIZES[size], BUTTON_VARIANTS[variant], className);
}

const CALLOUT_TONES = {
  brand: "bg-brand text-on-brand",
  tile: "bg-tile-2 text-ink",
  ok: "bg-ok text-white dark:text-[#06231b]",
  dark: "bg-ink text-page",
} as const;

/** The pill label — "Bestseller", "Most popular", "Dispatched". */
export function Callout({
  children,
  tone = "brand",
  className,
}: {
  children: React.ReactNode;
  tone?: keyof typeof CALLOUT_TONES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "caps inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px]",
        CALLOUT_TONES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/** Heading + optional standfirst on the left, a "view all" link on the right. */
export function SectionHead({
  title,
  standfirst,
  href,
  hrefLabel = "View all",
  className,
}: {
  title: string;
  standfirst?: string;
  href?: string;
  hrefLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-[22px] flex items-end justify-between gap-5", className)}>
      <div>
        <h2>{title}</h2>
        {standfirst && <p className="mt-1.5 text-sm text-ink-muted">{standfirst}</p>}
      </div>
      {href && (
        <Link href={href} className="shrink-0 text-sm font-bold underline underline-offset-2">
          {hrefLabel}
        </Link>
      )}
    </div>
  );
}

export function Breadcrumb({ trail }: { trail: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-x-[7px] gap-y-1 py-[18px] text-[13px] text-ink-muted">
      {trail.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="flex items-center gap-x-[7px]">
          {i > 0 && <span aria-hidden>/</span>}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:underline">
              {crumb.label}
            </Link>
          ) : (
            <span>{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** Tinted band that opens a listing or landing page. */
export function PageHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("bg-tile py-[34px]", className)}>
      <Wrap>{children}</Wrap>
    </div>
  );
}

/** Standfirst under a PageHeader's h1. */
export function Standfirst({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn("mt-3 max-w-[60ch] text-[17px] leading-[1.55] text-ink-muted", className)}>{children}</p>;
}

export function Rule({ className }: { className?: string }) {
  return <div className={cn("my-[22px] h-px bg-line", className)} aria-hidden />;
}

/** Five glyphs, filled to the nearest whole star. */
export function Stars({ rating, className }: { rating: number; className?: string }) {
  const filled = Math.round(rating);
  return (
    <span className={cn("text-[13px] tracking-[0.06em] text-ink", className)}>
      <span className="sr-only">{rating.toFixed(1)} out of 5</span>
      <span aria-hidden>
        {"★".repeat(filled)}
        <span className="text-ink-subtle">{"★".repeat(5 - filled)}</span>
      </span>
    </span>
  );
}

/** Tick list used in buy boxes and package cards. */
export function CheckList({ items, className }: { items: React.ReactNode[]; className?: string }) {
  return (
    <ul className={cn("flex flex-col gap-2.5", className)}>
      {items.map((item, i) => (
        <li key={i} className="relative pl-6 text-sm leading-[1.45] text-ink-muted">
          <span aria-hidden className="absolute left-0 font-bold text-ok">
            ✓
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/** Horizontally scrollable table — never lets a wide table scroll the page. */
export function TableWrap({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto rounded-tile bg-tile inset-ring inset-ring-card-edge", className)}>
      {children}
    </div>
  );
}

export const TABLE_CLASS = "w-full min-w-[560px] border-collapse text-sm";
export const TH_CLASS = "caps border-b border-line px-[18px] py-[13px] text-left align-top text-ink-muted";
export const TD_CLASS = "border-b border-line px-[18px] py-[13px] text-left align-top";
export const ROW_TH_CLASS = "border-b border-line px-[18px] py-[13px] text-left align-top font-bold";
