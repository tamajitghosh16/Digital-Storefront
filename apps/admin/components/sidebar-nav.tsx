"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Coins,
  FileStack,
  HelpCircle,
  Image as ImageIcon,
  IndianRupee,
  LayoutDashboard,
  Link2,
  type LucideIcon,
  Quote,
  Settings,
  ShoppingBag,
  Star,
  Type,
  Users,
} from "lucide-react";
import { cn } from "@repo/ui/utils";

/**
 * Back-office navigation, rendered inside the black dock in app/layout.tsx.
 *
 * Grouped and labelled by the job being done rather than by the data model:
 * the Publisher looks for "Homepage text", not for "ContentBlock". The
 * groups deliberately mirror how the work actually splits up — selling,
 * editing the website, running the publishing side, and administration.
 *
 * Colours here are hand-picked white-on-black, not the shared `ink`/`tile`
 * tokens — the dock is a fixed dark surface regardless of the rest of the
 * (light-only) app, so it needs its own contrast pair rather than one that
 * assumes a white ground.
 */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Selling",
    items: [
      { href: "/catalogue", label: "Books & products", icon: BookOpen },
      { href: "/orders", label: "Orders", icon: ShoppingBag },
      { href: "/reviews", label: "Reviews", icon: Star },
    ],
  },
  {
    heading: "Your website",
    items: [
      { href: "/content/banners", label: "Homepage hero", icon: ImageIcon },
      { href: "/content/homepage", label: "Homepage text", icon: Type },
      { href: "/content/faqs", label: "FAQs", icon: HelpCircle },
      { href: "/content/testimonials", label: "Testimonials", icon: Quote },
      { href: "/settings/navigation", label: "Menu links", icon: Link2 },
      { href: "/settings/site", label: "Site details", icon: Settings },
    ],
  },
  {
    heading: "Money",
    items: [
      { href: "/settings/pricing", label: "Pricing & delivery", icon: IndianRupee },
      { href: "/royalties", label: "Royalties", icon: Coins },
    ],
  },
  {
    heading: "Publishing",
    items: [
      { href: "/submissions", label: "Submissions", icon: FileStack },
      { href: "/analytics", label: "Analytics", icon: BarChart3 },
      { href: "/settings/roles", label: "Staff & roles", icon: Users },
    ],
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  // "/catalogue/new" should light up "Books & products"; "/" only lights up
  // the dashboard, or every prefix check would match it.
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Back office" className="space-y-6">
      <NavLink href="/" label="Dashboard" icon={LayoutDashboard} current={pathname === "/"} />

      {NAV_GROUPS.map((group) => (
        <div key={group.heading}>
          <p className="mb-1.5 px-3.5 text-[11px] font-bold uppercase tracking-[0.1em] text-white/40">
            {group.heading}
          </p>
          <div className="space-y-0.5">
            {group.items.map((item) => (
              <NavLink key={item.href} {...item} current={isCurrent(item.href)} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

function NavLink({ href, label, icon: Icon, current }: NavItem & { current: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-full px-3.5 py-2 text-sm font-semibold transition-colors",
        current ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white"
      )}
    >
      <Icon aria-hidden className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
