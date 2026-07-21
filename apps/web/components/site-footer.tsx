import Link from "next/link";
import { getSiteSettings } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_SITE_SETTINGS } from "@/lib/sample-data";

// Admin-controlled (Settings > Site Settings in apps/admin) — falls back to
// sample settings in preview mode. Kept intentionally minimal (logo + year)
// to match the storefront's approved design mockup.
export async function SiteFooter() {
  const settings = await withFallback(() => getSiteSettings(), SAMPLE_SITE_SETTINGS);

  return (
    <footer className="border-t border-border px-5 py-7 sm:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" aria-label={settings.siteName}>
          {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
          <img src="/logo.svg" alt={settings.siteName} className="h-[26px] w-auto opacity-80" />
        </Link>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.siteName}
        </p>
      </div>
    </footer>
  );
}
