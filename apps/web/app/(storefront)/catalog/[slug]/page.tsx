import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Sparkles, Mail, Smartphone, ShoppingBag } from "lucide-react";
import { getSiteSettings } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_SITE_SETTINGS } from "@/lib/sample-data";
import { CATALOG_ITEMS, findCatalogItem } from "@/lib/catalog-data";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { Separator } from "@repo/ui/separator";

// Static informational pages for the 12 product/service verticals in the
// client's master PRD sheet (Ultimate_Master_PRD_All_Mandates.xlsx). These
// verticals aren't backed by the Prisma `Product` model yet, so content
// here is static rather than DB-driven — see apps/web/lib/catalog-data.ts.
export function generateStaticParams() {
  return CATALOG_ITEMS.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = findCatalogItem(slug);
  if (!item) return {};
  return { title: item.title };
}

const FLOW_ICON = {
  ecommerce: ShoppingBag,
  lead: Mail,
  licensing: Smartphone,
} as const;

export default async function CatalogItemPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = findCatalogItem(slug);
  if (!item) notFound();

  const settings = await withFallback(() => getSiteSettings(), SAMPLE_SITE_SETTINGS);
  const Icon = FLOW_ICON[item.flow];

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-brand-navy">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{item.title}</span>
      </nav>

      <div className="mt-6 rounded-2xl border border-border bg-card p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy-50">
          <Icon className="h-5 w-5 text-brand-navy" strokeWidth={1.75} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Badge variant="muted">{item.category}</Badge>
          {item.subBrand && <Badge variant="muted">{item.subBrand}</Badge>}
        </div>

        <h1 className="mt-3 font-serif text-3xl font-medium leading-tight text-brand-navy">{item.title}</h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.flowLabel}</p>

        <p className="mt-5 text-sm leading-relaxed text-foreground/90">{item.description}</p>

        <div className="mt-6 flex items-center gap-2 rounded-lg bg-brand-cream/60 px-4 py-3 text-xs text-foreground/80">
          <Sparkles className="h-4 w-4 shrink-0 text-brand-navy" strokeWidth={1.75} />
          25% of the sale volume from this listing is contributed to the Sashibhusan Chattopadhyay Memorial Trust.
        </div>

        <Separator className="my-7" />

        {item.flow === "ecommerce" && item.ctaHref && (
          <Button asChild size="lg">
            <Link href={item.ctaHref}>{item.ctaLabel}</Link>
          </Button>
        )}
        {item.flow === "lead" && !item.ctaHref && (
          <Button asChild size="lg">
            <a href={`mailto:${settings.contactEmail}?subject=${encodeURIComponent(`Inquiry: ${item.title}`)}`}>
              {item.ctaLabel}
            </a>
          </Button>
        )}
        {item.flow === "lead" && item.ctaHref && (
          <Button asChild size="lg">
            <Link href={item.ctaHref}>{item.ctaLabel}</Link>
          </Button>
        )}
        {item.flow === "licensing" && (
          <Button asChild size="lg">
            <a href={`mailto:${settings.contactEmail}?subject=${encodeURIComponent(`Access request: ${item.title}`)}`}>
              {item.ctaLabel}
            </a>
          </Button>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          This is a Phase 0 placeholder page — see README.md&apos;s &quot;What&apos;s real vs. what&apos;s a stub&quot; section.
        </p>
      </div>
    </div>
  );
}
