import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Sparkles, Clock, Check } from "lucide-react";
import { prisma } from "@repo/database";
import { Badge } from "@repo/ui/badge";
import { Separator } from "@repo/ui/separator";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { withFallback } from "@/lib/safe-fetch";
import { findSampleProduct } from "@/lib/sample-data";

// Admin-controlled per-product SEO — see apps/admin catalogue edit form.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = (await withFallback(() => prisma.product.findUnique({ where: { slug } }), null)) ?? findSampleProduct(slug);
  if (!product) return {};
  return {
    title: product.metaTitle || product.title,
    description: product.metaDescription || product.description || undefined,
    openGraph: product.ogImageUrl ? { images: [product.ogImageUrl] } : undefined,
  };
}

// FR-2.3: service package comparison — features, price, turnaround time.
// Falls back to sample data when there's no reachable database.
export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = (await withFallback(() => prisma.product.findUnique({ where: { slug } }), null)) ?? findSampleProduct(slug);
  if (!product || product.type !== "SERVICE_PACKAGE") notFound();

  const features = (product.description ?? "").split("\n").filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-brand-navy">Home</Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground">{product.title}</span>
      </nav>

      <div className="mt-6 rounded-2xl border border-border bg-card p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy-50">
          <Sparkles className="h-5 w-5 text-brand-navy" strokeWidth={1.75} />
        </div>

        <Badge variant="muted" className="mt-5">Service package</Badge>
        <h1 className="mt-3 font-serif text-3xl font-medium leading-tight text-brand-navy">{product.title}</h1>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <p className="text-2xl font-semibold text-foreground">₹{(product.priceCents / 100).toFixed(2)}</p>
          {product.turnaroundDays != null && (
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" strokeWidth={1.75} /> {product.turnaroundDays}-day turnaround
            </span>
          )}
        </div>

        <div className="mt-6">
          <AddToCartButton
            product={{
              productId: product.id,
              title: product.title,
              priceCents: product.priceCents,
              fulfillmentType: "SERVICE",
            }}
          />
        </div>

        <Separator className="my-7" />

        {features.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What&apos;s included</p>
            <ul className="mt-3 space-y-2.5">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-foreground/90">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" strokeWidth={2} />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
