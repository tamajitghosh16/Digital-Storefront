import Link from "next/link";
import { prisma, getSiteSettings } from "@repo/database";
import { getCurrentUser } from "@repo/auth/server";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_HEADER_NAV, SAMPLE_SITE_SETTINGS } from "@/lib/sample-data";
import { groupCatalogItemsByCategory } from "@/lib/catalog-data";
import { CartIndicator } from "./cart-indicator";
import { AccountMenu } from "./account-menu";
import { MobileNav } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

// Admin-controlled header nav (Settings > Navigation in apps/admin) — replaces
// what used to be hardcoded <a> tags here. Falls back to sample nav/settings
// when there's no reachable database (frontend preview mode).
export async function SiteHeader() {
  const [settings, links, user] = await Promise.all([
    withFallback(() => getSiteSettings(), SAMPLE_SITE_SETTINGS),
    withFallback(
      () => prisma.navLink.findMany({ where: { location: "HEADER", isActive: true }, orderBy: { order: "asc" } }),
      SAMPLE_HEADER_NAV
    ),
    withFallback(() => getCurrentUser(), null),
  ]);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 dark:bg-black dark:supports-[backdrop-filter]:bg-black">
      <div className="mx-auto flex h-[76px] max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-2.5">
          <MobileNav
            links={links}
            catalogGroups={groupCatalogItemsByCategory()}
            siteName={settings.siteName}
            signedIn={!!user}
          />
          <Link href="/" className="flex items-center" aria-label={settings.siteName}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
            <img
              src="/logo.svg"
              alt={settings.siteName}
              className="h-12 w-auto dark:hidden sm:h-[52px]"
            />
            {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
            <img
              src="/logo-dark.svg"
              alt={settings.siteName}
              className="hidden h-12 w-auto dark:block sm:h-[52px]"
            />
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-0.5">
            <ThemeToggle />
            <CartIndicator />
          </div>
          <AccountMenu user={user ? { name: user.name, email: user.email, role: user.role } : null} />
        </div>
      </div>
    </header>
  );
}
