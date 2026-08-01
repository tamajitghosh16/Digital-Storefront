"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui/utils";

/** Pill nav down the side of the account area. */
const LINKS = [
  { href: "/account/library", label: "Digital library" },
  { href: "/account/orders", label: "Orders" },
];

const AUTHOR_LINKS = [{ href: "/account/publishing", label: "Publishing & royalties" }];

export function AccountNav({ showPublishing }: { showPublishing: boolean }) {
  const pathname = usePathname();
  const links = showPublishing ? [...LINKS, ...AUTHOR_LINKS] : LINKS;

  return (
    <nav aria-label="Account sections" className="flex flex-col gap-1">
      {links.map((link) => {
        const active = pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-4 py-[11px] text-sm font-bold transition-colors",
              active ? "bg-ink text-ground" : "hover:bg-tile"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
