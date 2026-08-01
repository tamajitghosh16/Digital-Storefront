import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSiteSettings } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_SITE_SETTINGS } from "@/lib/sample-data";
import { CATALOG_ITEMS, findCatalogItem } from "@/lib/catalog";
import { Breadcrumb, Callout, PageHeader, SectionHead, Standfirst, Wrap, buttonClass } from "@/components/primitives";
import { TrustBand } from "@/components/marketing";

// Static informational pages for the twelve product/service verticals in
// the client's master PRD sheet. These aren't backed by the Prisma
// `Product` model yet, so content here is static — see lib/catalog.ts.
export function generateStaticParams() {
  return CATALOG_ITEMS.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = findCatalogItem(slug);
  return item ? { title: item.title } : {};
}

const FLOW_COPY = {
  ecommerce: {
    glyph: "▤",
    blurb: "Buy it straight from the storefront — add to cart, pay, done.",
  },
  lead: {
    glyph: "✉",
    blurb: "Tell us what you need and we'll come back with a quote and a timeline.",
  },
  licensing: {
    glyph: "◫",
    blurb: "Access is granted per account once your request is approved.",
  },
} as const;

export default async function CatalogItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findCatalogItem(slug);
  if (!item) notFound();

  const settings = await withFallback(() => getSiteSettings(), SAMPLE_SITE_SETTINGS);
  const flow = FLOW_COPY[item.flow];
  const siblings = CATALOG_ITEMS.filter(
    (candidate) => candidate.category === item.category && candidate.slug !== item.slug
  );

  const mailto = (subject: string) =>
    settings.contactEmail ? `mailto:${settings.contactEmail}?subject=${encodeURIComponent(subject)}` : "/services";

  const href =
    item.ctaHref ??
    mailto(item.flow === "licensing" ? `Access request: ${item.title}` : `Inquiry: ${item.title}`);
  const external = !item.ctaHref;

  return (
    <>
      <Wrap>
        <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: item.category }, { label: item.title }]} />
      </Wrap>

      <PageHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Callout tone="tile">{item.category}</Callout>
          {item.subBrand && <Callout tone="tile">{item.subBrand}</Callout>}
        </div>
        <h1 className="mt-4">{item.title}</h1>
        <Standfirst>{item.description}</Standfirst>
      </PageHeader>

      <Wrap className="grid gap-9 py-12 min-[980px]:grid-cols-[1fr_372px] min-[980px]:items-start min-[980px]:gap-12">
        <div className="min-w-0">
          <h2>What this covers</h2>
          <p className="mt-3.5 max-w-[66ch] text-base leading-[1.65] text-ink-muted">{item.description}</p>
          <p className="mt-3.5 max-w-[66ch] text-base leading-[1.65] text-ink-muted">
            25% of the sale volume from this listing is contributed to the Sashibhusan Book Press Memorial Trust.
          </p>
          <p className="mt-6 text-sm text-ink-subtle">
            This vertical isn&rsquo;t backed by the product data model yet — see README&rsquo;s &ldquo;What&rsquo;s
            real vs. what&rsquo;s a stub&rdquo; section.
          </p>

          {siblings.length > 0 && (
            <div className="mt-10">
              <SectionHead title={`More in ${item.category}`} />
              <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                {siblings.map((sibling) => (
                  <Link
                    key={sibling.slug}
                    href={`/catalog/${sibling.slug}`}
                    className="rounded-tile bg-tile p-5 transition-colors hover:bg-tile-2 inset-ring inset-ring-card-edge"
                  >
                    <strong className="block text-sm">{sibling.title}</strong>
                    <small className="mt-1 block text-xs text-ink-muted">{sibling.flowLabel}</small>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 min-[980px]:sticky min-[980px]:top-[68px]">
          <div className="rounded-tile bg-ground p-6 inset-ring inset-ring-line">
            <span aria-hidden className="grid h-11 w-11 place-items-center rounded-full bg-tile text-lg">
              {flow.glyph}
            </span>
            <p className="caps mt-4 text-ink-muted">{item.flowLabel}</p>
            <p className="mt-1.5 text-[15px] leading-[1.55] text-ink-muted">{flow.blurb}</p>
            {external ? (
              <a href={href} className={buttonClass("primary", "lg", "mt-5 w-full")}>
                {item.ctaLabel}
              </a>
            ) : (
              <Link href={href} className={buttonClass("primary", "lg", "mt-5 w-full")}>
                {item.ctaLabel}
              </Link>
            )}
          </div>
        </div>
      </Wrap>

      <TrustBand />
    </>
  );
}
