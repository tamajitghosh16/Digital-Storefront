import Link from "next/link";
import { Mail, Phone, MapPin } from "lucide-react";
import { prisma, getSiteSettings } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_FOOTER_NAV, SAMPLE_SITE_SETTINGS } from "@/lib/sample-data";

type SocialLinks = { twitter?: string; facebook?: string; instagram?: string };

// Admin-controlled footer (Settings > Navigation + Settings > Site Settings
// in apps/admin) — this component didn't exist before; the storefront had
// no footer at all. Falls back to sample nav/settings in preview mode.
export async function SiteFooter() {
  const [settings, links] = await Promise.all([
    withFallback(() => getSiteSettings(), SAMPLE_SITE_SETTINGS),
    withFallback(
      () => prisma.navLink.findMany({ where: { location: "FOOTER", isActive: true }, orderBy: { order: "asc" } }),
      SAMPLE_FOOTER_NAV
    ),
  ]);

  const social = (settings.socialLinks as SocialLinks | null) ?? {};
  const socialEntries = Object.entries(social).filter(([, url]) => !!url) as [string, string][];

  return (
    <footer className="border-t border-border bg-brand-cream">
      <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <p className="font-serif text-lg font-medium text-brand-navy">{settings.siteName}</p>
            {settings.tagline && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{settings.tagline}</p>}

            {socialEntries.length > 0 && (
              <div className="mt-5 flex gap-4">
                {socialEntries.map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    className="rounded-sm text-sm font-medium capitalize text-brand-navy transition-colors hover:text-brand-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream"
                  >
                    {platform}
                  </a>
                ))}
              </div>
            )}
          </div>

          {links.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Explore</p>
              <ul className="mt-4 space-y-2.5">
                {links.map((link) => (
                  <li key={link.id}>
                    <Link
                      href={link.href}
                      className="rounded-sm text-sm text-foreground/80 transition-colors hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(settings.contactEmail || settings.contactPhone || settings.addressLine) && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Get in touch</p>
              <ul className="mt-4 space-y-2.5 text-sm text-foreground/80">
                {settings.contactEmail && (
                  <li className="flex items-start gap-2">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <a
                      href={`mailto:${settings.contactEmail}`}
                      className="rounded-sm transition-colors hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-brand-cream"
                    >
                      {settings.contactEmail}
                    </a>
                  </li>
                )}
                {settings.contactPhone && (
                  <li className="flex items-start gap-2">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span>{settings.contactPhone}</span>
                  </li>
                )}
                {settings.addressLine && (
                  <li className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span>{settings.addressLine}</span>
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-10 border-t border-border/70 pt-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
