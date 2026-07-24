import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { prisma, getSiteSettings } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_SITE_SETTINGS, SAMPLE_FOOTER_NAV } from "@/lib/sample-data";

// Admin-controlled (Settings > Site Settings + Settings > Navigation in
// apps/admin) — falls back to sample settings/nav in preview mode. Mirrors
// the same NavLink query pattern site-header.tsx uses for HEADER links.
export async function SiteFooter() {
  const [settings, links] = await Promise.all([
    withFallback(() => getSiteSettings(), SAMPLE_SITE_SETTINGS),
    withFallback(
      () => prisma.navLink.findMany({ where: { location: "FOOTER", isActive: true }, orderBy: { order: "asc" } }),
      SAMPLE_FOOTER_NAV
    ),
  ]);

  const socialLinks =
    settings.socialLinks && typeof settings.socialLinks === "object"
      ? (settings.socialLinks as Record<string, string>)
      : null;

  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link href="/" aria-label={settings.siteName}>
            {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
            <img src="/logo.svg" alt={settings.siteName} className="h-auto w-40 object-contain dark:hidden" />
            {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
            <img
              src="/logo-dark.svg"
              alt={settings.siteName}
              className="hidden h-auto w-40 object-contain dark:block"
            />
          </Link>
          {settings.tagline && <p className="mt-3 max-w-xs text-sm text-muted-foreground">{settings.tagline}</p>}
          {socialLinks && Object.keys(socialLinks).length > 0 && (
            <div className="mt-4 flex gap-4">
              {Object.entries(socialLinks).map(([name, href]) => (
                <a
                  key={name}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm capitalize text-muted-foreground transition-colors hover:text-foreground"
                >
                  {name}
                </a>
              ))}
            </div>
          )}
        </div>

        {links.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-foreground">Explore</p>
            <nav className="mt-3 flex flex-col gap-2">
              {links.map((link) => (
                <Link
                  key={link.id}
                  href={link.href}
                  className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}

        {(settings.contactEmail || settings.contactPhone || settings.addressLine) && (
          <div>
            <p className="text-sm font-semibold text-foreground">Contact</p>
            <div className="mt-3 flex flex-col gap-2.5">
              {settings.contactEmail && (
                <a
                  href={`mailto:${settings.contactEmail}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  {settings.contactEmail}
                </a>
              )}
              {settings.contactPhone && (
                <a
                  href={`tel:${settings.contactPhone}`}
                  className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Phone className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  {settings.contactPhone}
                </a>
              )}
              {settings.addressLine && (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
                  {settings.addressLine}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border px-5 py-5 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {settings.siteName}
          </p>
        </div>
      </div>
    </footer>
  );
}
