"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui/utils";

interface NavLinkData {
  id: string;
  label: string;
  href: string;
}

export function SiteNavLinks({ links }: { links: NavLinkData[] }) {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-7 md:flex">
      {links.map((link) => {
        const active = link.href !== "/" && pathname.startsWith(link.href);
        return (
          <Link
            key={link.id}
            href={link.href}
            className={cn(
              "rounded-sm text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              active ? "text-brand-navy" : "text-foreground/80 hover:text-brand-navy"
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
