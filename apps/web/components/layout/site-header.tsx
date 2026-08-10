import { Suspense } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { getPricingConfig, getSiteSettings } from "@repo/database";
import { getCurrentUser } from "@repo/auth/server";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_SITE_SETTINGS } from "@/lib/sample-data";
import { buildDepartments } from "@/lib/navigation";
import { Wrap } from "@/components/primitives";
import { AccountMenu } from "./account-menu";
import { CartIndicator } from "./cart-indicator";
import { DepartmentNav } from "./department-nav";
import { HeaderSearch } from "./header-search";
import { IconButtonLink } from "./icon-button";
import { MobileNav } from "./mobile-nav";
import { PromoBar } from "./promo-bar";
import { ThemeToggle } from "./theme-toggle";

/**
 * Storefront chrome: offer marquee → masthead → department bar. Site
 * name, phone and contact details are admin-controlled (the singleton
 * SiteSettings row), falling back to sample settings when no database
 * is reachable.
 */
export async function SiteHeader() {
  const [settings, user, pricing, departments] = await Promise.all([
    withFallback(() => getSiteSettings(), SAMPLE_SITE_SETTINGS),
    withFallback(() => getCurrentUser(), null),
    getPricingConfig(),
    buildDepartments(),
  ]);

  return (
    <header>
      <PromoBar pricing={pricing} />

      <Wrap className="flex items-center gap-4 py-4 lg:gap-7">
        <MobileNav departments={departments} signedIn={!!user} />

        <Link href="/" className="flex shrink-0 items-center" aria-label={settings.siteName}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
          <img
            src="/logo.svg"
            alt={settings.siteName}
            className="h-auto w-[168px] object-contain dark:hidden min-[600px]:w-[216px] lg:w-[248px]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
          <img
            src="/logo-dark.svg"
            alt={settings.siteName}
            className="hidden h-auto w-[168px] object-contain dark:block min-[600px]:w-[216px] lg:w-[248px]"
          />
        </Link>

        <Suspense fallback={<div className="hidden h-12 max-w-[620px] flex-1 rounded-full bg-tile min-[900px]:block" />}>
          <HeaderSearch className="hidden max-w-[620px] flex-1 min-[900px]:block" />
        </Suspense>

        <div className="ml-auto flex shrink-0 items-center gap-0.5">
          <ThemeToggle />
          <IconButtonLink href="/account/library" label="Library">
            <Heart className="h-[22px] w-[22px]" strokeWidth={1.9} />
          </IconButtonLink>
          <CartIndicator />
          <AccountMenu user={user ? { name: user.name, email: user.email, role: user.role } : null} />
        </div>
      </Wrap>

      {/* Search moves under the masthead where it can't fit beside it. */}
      <Wrap className="pb-3 min-[900px]:hidden">
        <Suspense fallback={<div className="h-12 rounded-full bg-tile" />}>
          <HeaderSearch />
        </Suspense>
      </Wrap>

      <DepartmentNav departments={departments} />
    </header>
  );
}
