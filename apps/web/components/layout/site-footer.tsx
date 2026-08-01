import Link from "next/link";
import { prisma, getSiteSettings } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_FOOTER_NAV, SAMPLE_SITE_SETTINGS } from "@/lib/sample-data";
import { groupCatalogItemsByCategory } from "@/lib/catalog";
import { FOOTER_COLUMNS } from "@/lib/navigation";
import { Wrap } from "@/components/primitives";

// Admin-controlled (Settings > Site Settings and Settings > Navigation in
// apps/admin), falling back to sample settings and nav in preview mode.
// The admin-managed FOOTER NavLink rows lead the Shop column, ahead of the
// standing links the design specifies.

const PAYMENT_MARKS = ["UPI", "VISA", "MASTERCARD", "RUPAY", "NETBANKING"];

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

  const departments = groupCatalogItemsByCategory();

  const columns = [
    {
      title: "Shop",
      items: [
        ...links.map((link) => ({ label: link.label, href: link.href })),
        ...FOOTER_COLUMNS[0]!.items.filter(
          (item) => !links.some((link) => link.href === item.href)
        ),
      ],
    },
    {
      title: "Departments",
      items: departments.map((group) => ({
        label: group.category,
        href: `/catalog/${group.items[0]!.slug}`,
      })),
    },
    ...FOOTER_COLUMNS.slice(1),
  ];

  return (
    <footer className="bg-tile pb-7 pt-12">
      <Wrap>
        <div className="grid gap-7 border-b border-line pb-8 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
          <div className="col-span-2 max-[640px]:col-span-1">
            <Link href="/" className="mb-4 inline-flex" aria-label={settings.siteName}>
              {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
              <img src="/logo.svg" alt={settings.siteName} className="h-auto w-[232px] object-contain dark:hidden" />
              {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
              <img
                src="/logo-dark.svg"
                alt={settings.siteName}
                className="hidden h-auto w-[232px] object-contain dark:block"
              />
            </Link>

            {settings.tagline && (
              <p className="max-w-[34ch] text-sm leading-relaxed text-ink-muted">{settings.tagline}</p>
            )}
            {settings.addressLine && (
              <p className="mt-2.5 max-w-[34ch] text-sm leading-relaxed text-ink-muted">{settings.addressLine}</p>
            )}

            <div className="mt-4 flex flex-col gap-2 text-sm">
              {settings.contactEmail && (
                <a href={`mailto:${settings.contactEmail}`} className="hover:underline">
                  {settings.contactEmail}
                </a>
              )}
              {settings.contactPhone && (
                <a href={`tel:${settings.contactPhone}`} className="hover:underline">
                  {settings.contactPhone}
                </a>
              )}
              {socialLinks &&
                Object.entries(socialLinks).map(([name, href]) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="capitalize hover:underline"
                  >
                    {name}
                  </a>
                ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {PAYMENT_MARKS.map((mark) => (
                <span
                  key={mark}
                  className="rounded-[5px] bg-ground px-2.5 py-[5px] text-[10px] font-bold tracking-[0.06em]"
                >
                  {mark}
                </span>
              ))}
            </div>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h5 className="caps mb-3.5 text-ink-muted">{column.title}</h5>
              <nav className="flex flex-col gap-[11px]">
                {column.items.map((item) => (
                  <Link key={`${column.title}-${item.href}-${item.label}`} href={item.href} className="text-sm hover:underline">
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-between gap-3 pt-[22px] text-[13px] text-ink-muted">
          <p>
            © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
          </p>
          <p>25% of sale volume funds the Sashibhusan Book Press Memorial Trust.</p>
        </div>
      </Wrap>
    </footer>
  );
}
