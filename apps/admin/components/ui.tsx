import Link from "next/link";
import { cn } from "@repo/ui/utils";

/**
 * The back office's presentational kit.
 *
 * Written for the audience the admin actually has — a publisher and their
 * staff, not developers. Three rules follow from that and explain most of
 * what's here:
 *
 *   1. Every input carries a label in ordinary English and, where the field
 *      isn't self-evident, a line of help underneath. No jargon labels like
 *      "slug" or "OG image" without an explanation beside them.
 *   2. Forms are broken into titled sections with a sentence saying what the
 *      section is for, so a long screen reads as a few short ones.
 *   3. Colour comes from the shared design tokens in
 *      `packages/config/tailwind-preset.css` — the same palette as the
 *      storefront, light and dark — rather than raw Tailwind greys.
 */

// ── Page furniture ──────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  backHref,
  backLabel,
  action,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="mb-8">
      {backHref && (
        <Link
          href={backHref}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted transition-colors hover:text-brand"
        >
          <span aria-hidden>←</span>
          {backLabel ?? "Back"}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[28px] font-bold tracking-[-0.02em] text-ink">{title}</h1>
          {description && <p className="mt-1.5 max-w-[65ch] text-sm leading-relaxed text-ink-muted">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

/** A titled group of fields. Long forms become a stack of these. */
export function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-tile border border-line bg-ground p-6", className)}>
      <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-ink">{title}</h2>
      {description && <p className="mt-1 max-w-[70ch] text-sm leading-relaxed text-ink-muted">{description}</p>}
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  );
}

/** Side-by-side fields on wide screens, stacked on narrow ones. */
export function FieldRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-5 sm:grid-cols-2", className)}>{children}</div>;
}

// ── Fields ──────────────────────────────────────────────────────────

const controlClass =
  "w-full rounded-btn border border-line bg-ground px-3 py-2.5 text-sm text-ink transition-colors placeholder:text-ink-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30";

export { controlClass };

export function Field({
  label,
  help,
  htmlFor,
  required,
  children,
}: {
  label: string;
  help?: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink">
        {label}
        {required && (
          <span className="ml-1 text-sale" aria-hidden>
            *
          </span>
        )}
      </label>
      {help && <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{help}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}

export function TextField({
  label,
  help,
  name,
  required,
  ...props
}: { label: string; help?: string; name: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} help={help} htmlFor={name} required={required}>
      <input id={name} name={name} required={required} className={controlClass} {...props} />
    </Field>
  );
}

export function TextAreaField({
  label,
  help,
  name,
  required,
  rows = 3,
  ...props
}: { label: string; help?: string; name: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} help={help} htmlFor={name} required={required}>
      <textarea id={name} name={name} required={required} rows={rows} className={controlClass} {...props} />
    </Field>
  );
}

export function SelectField({
  label,
  help,
  name,
  required,
  children,
  ...props
}: { label: string; help?: string; name: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} help={help} htmlFor={name} required={required}>
      <select id={name} name={name} required={required} className={controlClass} {...props}>
        {children}
      </select>
    </Field>
  );
}

/** Money in rupees. The action converts to paise — nobody types paise. */
export function MoneyField({
  label,
  help,
  name,
  defaultValue,
  required,
}: {
  label: string;
  help?: string;
  name: string;
  defaultValue?: string | number;
  required?: boolean;
}) {
  return (
    <Field label={label} help={help} htmlFor={name} required={required}>
      <div className="flex items-center rounded-btn border border-line bg-ground focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
        <span className="pl-3 text-sm font-semibold text-ink-muted" aria-hidden>
          ₹
        </span>
        <input
          id={name}
          name={name}
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          required={required}
          defaultValue={defaultValue}
          className="w-full bg-transparent px-2 py-2.5 text-sm text-ink focus:outline-none"
        />
      </div>
    </Field>
  );
}

/** A checkbox that reads as a sentence rather than a bare tick-box. */
export function CheckboxField({
  label,
  help,
  name,
  defaultChecked,
}: {
  label: string;
  help?: string;
  name: string;
  defaultChecked?: boolean;
}) {
  return (
    <label
      htmlFor={name}
      className="flex cursor-pointer items-start gap-3 rounded-btn border border-line bg-tile-3 p-3.5 transition-colors hover:border-brand/50"
    >
      <input
        id={name}
        name={name}
        type="checkbox"
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {help && <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{help}</span>}
      </span>
    </label>
  );
}

// ── Feedback ────────────────────────────────────────────────────────

/** Filled ink, not outlined — the more urgent of the two banners gets more ink. */
export function ErrorBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-3 rounded-btn bg-ink px-4 py-3.5 text-sm font-semibold text-white">
      <span aria-hidden className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white text-[10px] font-bold text-ink">
        !
      </span>
      {message}
    </div>
  );
}

/** Shown after a redirect back with ?saved=… so a save never looks silent. */
export function SavedBanner({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <div role="status" className="flex items-start gap-3 rounded-btn border border-line-strong bg-ground px-4 py-3.5 text-sm font-semibold text-ink">
      <span aria-hidden className="mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">
        ✓
      </span>
      {message}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-tile border border-dashed border-line-strong bg-ground px-6 py-14 text-center">
      <p className="font-display text-base font-bold text-ink">{title}</p>
      <p className="mx-auto mt-1.5 max-w-[46ch] text-sm leading-relaxed text-ink-muted">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

// ── Buttons and links ───────────────────────────────────────────────

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-btn px-4 py-2.5 text-sm font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export function buttonClass(variant: "primary" | "secondary" | "danger" = "primary", className?: string) {
  return cn(
    buttonBase,
    variant === "primary" && "bg-brand text-on-brand hover:bg-brand-press",
    variant === "secondary" && "border border-line-strong bg-ground text-ink hover:bg-tile",
    // Same ink as primary, inverted on hover, rather than a colour swap —
    // "about to commit more ink" reads as caution without needing red.
    variant === "danger" && "border-2 border-ink bg-ground text-ink hover:bg-ink hover:text-white",
    className
  );
}

export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: {
  href: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}

// ── Tables ──────────────────────────────────────────────────────────

export function Table({ head, children }: { head: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-tile border border-line bg-ground">
      <table className="w-full min-w-[42rem] text-sm">
        <thead className="border-b border-line bg-tile-3 text-left">
          <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:text-xs [&>th]:font-bold [&>th]:uppercase [&>th]:tracking-wide [&>th]:text-ink-muted">
            {head}
          </tr>
        </thead>
        <tbody className="[&>tr:not(:last-child)]:border-b [&>tr:not(:last-child)]:border-line [&>tr>td]:px-4 [&>tr>td]:py-3 [&>tr]:align-middle">
          {children}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Status reads as a stamp, not a colour: filled ink for "live", a hairline
 * outline for "off", a dashed outline for "in progress". Three tones, three
 * shapes — legible without a single hue in the system.
 */
export function Pill({ tone, children }: { tone: "on" | "off" | "info"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide",
        tone === "on" && "bg-ink text-white",
        tone === "off" && "border border-line-strong text-ink-muted",
        tone === "info" && "border border-dashed border-line-strong text-ink"
      )}
    >
      {children}
    </span>
  );
}

/** Small inline thumbnail for list rows — plain <img>, since Blob URLs are remote. */
export function Thumb({ src, alt }: { src?: string | null; alt: string }) {
  if (!src) {
    return (
      <span className="grid h-12 w-9 shrink-0 place-items-center rounded-[10px] border border-line bg-tile text-[10px] font-bold text-ink-subtle">
        —
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className="h-12 w-9 shrink-0 rounded-[10px] border border-line object-cover" />;
}
