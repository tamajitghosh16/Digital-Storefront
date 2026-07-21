"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Package, Library, LayoutDashboard } from "lucide-react";
import { cn } from "@repo/ui/utils";

const baseLinks = [
  { href: "/account/orders", label: "Order history", Icon: Package },
  { href: "/account/library", label: "Digital library", Icon: Library },
];

export function AccountNav({ showPublishing }: { showPublishing: boolean }) {
  const pathname = usePathname();
  const links = showPublishing
    ? [...baseLinks, { href: "/account/publishing", label: "Publishing dashboard", Icon: LayoutDashboard }]
    : baseLinks;

  return (
    <nav className="space-y-1">
      {links.map(({ href, label, Icon }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand-navy-50 text-brand-navy" : "text-foreground/70 hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
