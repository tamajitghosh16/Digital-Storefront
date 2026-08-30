"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@repo/ui/utils";
import type { InventoryCategory } from "@/components/app-shell";
import { FIXED_DEPARTMENTS } from "@/app/menu/fixed-departments";

/**
 * Back-office navigation: a stack of bordered, rounded groups (Menu,
 * Inventory, Homepage, Footer, Users and Staffs) rendered inside the paper
 * sidebar panel in app-shell.tsx.
 *
 * Every group except Inventory mirrors an operator-drawn wireframe rather
 * than the data model, and "All Users" under Users and Staffs points ahead
 * of a page that doesn't exist yet — kept anyway so the sidebar matches the
 * agreed structure now. Inventory mirrors the storefront's actual menu bar,
 * which apps/web's `buildDepartments()` (apps/web/lib/navigation.ts) builds
 * from two merged sources: five fixed business-line departments with real
 * pages already built, and the admin-managed `MenuCategory`/`MenuProduct`
 * rows. The fixed half is `FIXED_DEPARTMENTS` in `app/menu/fixed-departments.ts`,
 * shared with the `/menu/categories` and `/menu/products` listings.
 */

interface NavItem {
  href: string;
  label: string;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";

interface InventoryTab {
  id: string;
  name: string;
  products: { id: string; name: string; href: string; internal: boolean }[];
}

/** Same order apps/web's buildDepartments() returns them in: the five fixed departments, then admin-created ones. */
function buildInventoryTabs(categories: InventoryCategory[]): InventoryTab[] {
  const fixed: InventoryTab[] = FIXED_DEPARTMENTS.map((dept) => ({
    id: `fixed:${dept.label}`,
    name: dept.label,
    products: dept.products.map((product) => ({
      id: product.adminHref ?? product.href,
      name: product.label,
      // A line with an in-app admin page links there directly; the rest link out to the storefront.
      href: product.adminHref ?? product.href,
      internal: product.adminHref != null,
    })),
  }));
  const dynamic: InventoryTab[] = categories.map((category) => ({
    id: category.id,
    name: category.name,
    products: category.products.map((product) => ({
      id: product.id,
      name: product.name,
      href: `/${product.slug}`,
      internal: false,
    })),
  }));
  return [...fixed, ...dynamic];
}

/** Groups either side of the dynamic Inventory section — order matters, Inventory renders between these two. */
const NAV_GROUPS_BEFORE_INVENTORY: NavGroup[] = [
  {
    heading: "Menu",
    items: [
      { href: "/menu/categories", label: "Category" },
      { href: "/menu/products", label: "Product" },
    ],
  },
];

const NAV_GROUPS_AFTER_INVENTORY: NavGroup[] = [
  {
    heading: "Supply",
    items: [
      { href: "/supply/purchase-orders", label: "Purchase Orders" },
      { href: "/supply/vendors", label: "All Vendors" },
    ],
  },
  {
    heading: "Homepage",
    items: [
      { href: "/content/banners", label: "Hero section" },
      { href: "/content/faqs", label: "FAQs" },
      { href: "/content/testimonials", label: "Customer Reviews" },
    ],
  },
  {
    heading: "Footer",
    items: [
      { href: "/settings/navigation", label: "Links" },
      { href: "/settings/site", label: "Contacts" },
    ],
  },
  {
    heading: "Users and Staffs",
    items: [
      { href: "/users", label: "All Users" },
      { href: "/settings/roles", label: "Staffs and Roles" },
    ],
  },
];

const INVENTORY_INITIAL_COUNT = 5;

export function SidebarNav({ menuCategories }: { menuCategories: InventoryCategory[] }) {
  const pathname = usePathname();

  // "/educational-material/books/new" should light up "Books & products";
  // "/" only lights up the dashboard, or every prefix check would match it.
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Back office" className="flex h-full flex-col gap-3.5">
      <TopLevelLink href="/" label="Dashboard" current={pathname === "/"} />

      <div className="min-h-0 flex-1 space-y-3.5 overflow-y-auto">
        {NAV_GROUPS_BEFORE_INVENTORY.map((group) => (
          <NavGroupBox key={group.heading} heading={group.heading}>
            {group.items.map((item) => (
              <NavLink key={item.href} {...item} current={isCurrent(item.href)} />
            ))}
          </NavGroupBox>
        ))}

        <InventoryGroup categories={menuCategories} />

        {NAV_GROUPS_AFTER_INVENTORY.map((group) => (
          <NavGroupBox key={group.heading} heading={group.heading}>
            {group.items.map((item) => (
              <NavLink key={item.href} {...item} current={isCurrent(item.href)} />
            ))}
          </NavGroupBox>
        ))}
      </div>

      <TopLevelLink href="/account" label="My account" current={isCurrent("/account")} />
    </nav>
  );
}

/** The bordered/tinted box every nav group renders inside, heading included. */
function NavGroupBox({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] border border-line bg-tile p-2.5">
      <p className="border-b border-line pb-1.5 text-[13px] font-extrabold uppercase tracking-[0.04em] text-ink">
        {heading}
      </p>
      <div className="mt-1.5 space-y-0.5">{children}</div>
    </div>
  );
}

/**
 * The storefront's actual menu bar, mirrored: the five fixed departments
 * plus the live `MenuCategory` ones, merged by buildInventoryTabs() in the
 * same order apps/web's own buildDepartments() returns them. Each tab is an
 * accordion trigger rather than a link — clicking one opens its product
 * list instead of navigating, since there's no per-category admin page to
 * send it to. A fixed-department product with `internal: true` in
 * FIXED_DEPARTMENTS has a real admin page and links there in-app; every
 * other product (the `Digital & Tech Solutions` pair, and every
 * `MenuCategory` product) still links out to its live storefront page,
 * same as "View webstore" in the topbar, since there's no admin page for it.
 *
 * Capped at INVENTORY_INITIAL_COUNT tabs with a "view more" reveal — the
 * MenuCategory half of this list is unbounded (an operator can add
 * categories from /menu/categories any time) and the sidebar isn't.
 */
function InventoryGroup({ categories }: { categories: InventoryCategory[] }) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const pathname = usePathname();
  const isCurrent = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  const tabs = buildInventoryTabs(categories);
  const visible = showAll ? tabs : tabs.slice(0, INVENTORY_INITIAL_COUNT);
  const hiddenCount = tabs.length - visible.length;

  return (
    <div className="rounded-[12px] border border-line bg-tile p-2.5">
      <p className="border-b border-line pb-1.5 text-[13px] font-extrabold uppercase tracking-[0.04em] text-ink">
        Inventory
      </p>
      <div className="mt-1.5 space-y-0.5">
        {visible.map((tab) => {
          const open = openIds.has(tab.id);
          return (
            <div key={tab.id}>
              <button
                type="button"
                onClick={() => toggle(tab.id)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-2 rounded-full px-3 py-1.5 text-left text-[13px] text-ink-muted transition-colors hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
              >
                <span className="truncate">{tab.name}</span>
                <ChevronDown
                  aria-hidden
                  className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
                />
              </button>
              {open && (
                <div className="mt-0.5 ml-3 space-y-0.5 border-l border-line pl-3">
                  {tab.products.length === 0 ? (
                    <p className="px-3 py-1 text-[12px] text-ink-subtle">No products yet.</p>
                  ) : (
                    tab.products.map((product) =>
                      product.internal ? (
                        <Link
                          key={product.id}
                          href={product.href}
                          aria-current={isCurrent(product.href) ? "page" : undefined}
                          className={cn(
                            "block truncate rounded-full px-3 py-1 text-[12.5px] transition-colors",
                            isCurrent(product.href)
                              ? "bg-ink font-semibold text-ground"
                              : "text-ink-muted hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
                          )}
                        >
                          {product.name}
                        </Link>
                      ) : (
                        <a
                          key={product.id}
                          href={`${STOREFRONT_URL}${product.href}`}
                          target="_blank"
                          rel="noreferrer"
                          className="block truncate rounded-full px-3 py-1 text-[12.5px] text-ink-muted transition-colors hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
                        >
                          {product.name}
                        </a>
                      )
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="mt-1.5 w-full rounded-full px-3 py-1 text-center text-[12px] font-semibold text-ink-muted transition-colors hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
        >
          View more ({hiddenCount})
        </button>
      )}
    </div>
  );
}

/** Dashboard and My account — the two pill-buttons that bookend the group stack. */
function TopLevelLink({ href, label, current }: NavItem & { current: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "block rounded-full border border-line-strong px-4 py-2.5 text-center text-[13px] font-semibold transition-colors",
        current ? "bg-ink text-ground" : "text-ink hover:bg-tile"
      )}
    >
      {label}
    </Link>
  );
}

function NavLink({ href, label, current }: NavItem & { current: boolean }) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "block rounded-full px-3 py-1.5 text-[13px] transition-colors",
        current
          ? "bg-ink font-semibold text-ground"
          : "text-ink-muted hover:bg-black/[0.06] hover:text-ink dark:hover:bg-white/10"
      )}
    >
      {label}
    </Link>
  );
}
