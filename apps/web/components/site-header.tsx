import Link from "next/link";
import { prisma, getSiteSettings } from "@repo/database";
import { getCurrentUser } from "@repo/auth/server";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_HEADER_NAV, SAMPLE_SITE_SETTINGS } from "@/lib/sample-data";
import { CartIndicator } from "./cart-indicator";
import { AccountMenu } from "./account-menu";
import { MobileNav } from "./mobile-nav";
import { SiteNavLinks } from "./site-nav-links";
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
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex items-center gap-2">
          <MobileNav links={links} siteName={settings.siteName} signedIn={!!user} />
          <Link href="/" className="font-serif text-xl font-medium tracking-tight text-brand-navy">
            {settings.siteName}
          </Link>
        </div>

        <SiteNavLinks links={links} />

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <CartIndicator />
          <AccountMenu user={user ? { name: user.name, email: user.email, role: user.role } : null} />
        </div>
      </div>
    </header>
  );
}
