import Link from "next/link";
import { cn } from "@repo/ui/utils";

/**
 * Masthead action: glyph above a label, the label appearing only once
 * there's room for it. Shared by the library, cart and account controls
 * so they stay on one baseline.
 */
export const ICON_BUTTON_CLASS =
  "inline-flex flex-col items-center gap-[3px] rounded-btn px-2.5 py-2 text-[11px] text-ink transition-colors hover:bg-tile";

export const ICON_LABEL_CLASS = "hidden min-[1100px]:block";

export function IconButtonLink({
  href,
  label,
  children,
  className,
  badge,
  ...rest
}: {
  href: string;
  label: string;
  children: React.ReactNode;
  className?: string;
  badge?: React.ReactNode;
} & Omit<React.ComponentProps<typeof Link>, "href" | "children" | "className">) {
  return (
    <Link href={href} className={cn(ICON_BUTTON_CLASS, className)} {...rest}>
      <span className="relative text-lg leading-none">
        {children}
        {badge}
      </span>
      <span className={ICON_LABEL_CLASS}>{label}</span>
    </Link>
  );
}

/** Count bubble on the cart glyph. */
export function IconBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="absolute -right-2.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand px-1.5 text-[11px] font-bold tabular-nums text-on-brand">
      {children}
    </span>
  );
}
