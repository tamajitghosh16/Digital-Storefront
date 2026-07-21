import Link from "next/link";
import Image from "next/image";
import { Star, Truck, Download, PenLine, BookOpen, Tablet, Sparkles, PenSquare, ArrowRight } from "lucide-react";
import { prisma } from "@repo/database";
import { Button } from "@repo/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui/accordion";
import { ProductCard } from "@/components/product-card";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_PRODUCTS, SAMPLE_BANNERS, SAMPLE_TESTIMONIALS, SAMPLE_FAQS, SAMPLE_CATEGORIES } from "@/lib/sample-data";

const categoryIcons = { "Physical Books": BookOpen, "E-Books": Tablet, "Publishing Services": Sparkles, "Self-Publishing": PenSquare } as const;

// FR-1.1: homepage featuring bestsellers, new releases, and promoted services.
// Hero/promo banners, testimonials, and FAQs are all admin-controlled
// (apps/admin: Homepage Banners / Testimonials / FAQs) rather than hardcoded.
// Falls back to static sample data when there's no reachable database, so
// the frontend can be reviewed without seeding anything.
export default async function HomePage() {
  const [featured, banners, testimonials, faqs] = await Promise.all([
    withFallback(
      () => prisma.product.findMany({ where: { isPublished: true }, orderBy: { createdAt: "desc" }, take: 8 }),
      SAMPLE_PRODUCTS.slice(0, 8)
    ),
    withFallback(() => prisma.banner.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }), SAMPLE_BANNERS),
    withFallback(
      () => prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
      SAMPLE_TESTIMONIALS
    ),
    withFallback(() => prisma.faq.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }), SAMPLE_FAQS),
  ]);

  const [heroBanner, ...restBanners] = banners;

  return (
    <div>
      <Hero banner={heroBanner} />

      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl font-medium text-brand-navy sm:text-3xl">Explore the storefront</h2>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {SAMPLE_CATEGORIES.map((cat) => {
            const Icon = categoryIcons[cat.title as keyof typeof categoryIcons];
            return (
              <Link
                key={cat.title}
                href={cat.href}
                className="group rounded-2xl border border-border bg-card p-5 text-center transition-all hover:-translate-y-0.5 hover:border-brand-navy/40 hover:shadow-md"
              >
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand-navy-50 transition-colors group-hover:bg-brand-navy-solid group-hover:text-white">
                  <Icon className="h-5 w-5 text-brand-navy transition-colors group-hover:text-white" strokeWidth={1.75} />
                </div>
                <p className="mt-3 text-sm font-semibold text-foreground">{cat.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{cat.body}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {restBanners.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restBanners.map((banner) => (
              <div key={banner.id} className="rounded-xl border border-border bg-brand-cream/60 p-5">
                <p className="font-serif text-base font-medium text-brand-navy">{banner.title}</p>
                {banner.subtitle && <p className="mt-1 text-sm text-muted-foreground">{banner.subtitle}</p>}
                {banner.ctaText && banner.ctaHref && (
                  <Link href={banner.ctaHref} className="mt-3 inline-block text-sm font-medium text-brand-accent hover:underline">
                    {banner.ctaText} →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <ValueProps />

      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl font-medium text-brand-navy sm:text-3xl">New &amp; Featured</h2>
          <Link href="/books" className="flex items-center gap-1 text-sm font-medium text-brand-accent hover:underline">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-9 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
          {featured.length === 0 && (
            <p className="col-span-full rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
              No products yet — run <code className="rounded bg-muted px-1.5 py-0.5">npm run seed --workspace=@repo/database</code> to add sample data.
            </p>
          )}
        </div>
      </section>

      {testimonials.length > 0 && (
        <section className="border-t border-border bg-brand-cream/50 py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="font-serif text-2xl font-medium text-brand-navy sm:text-3xl">What readers say</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="rounded-2xl border border-border bg-card p-6">
                  {t.rating && (
                    <div className="flex gap-0.5 text-brand-accent">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5" fill={i < t.rating! ? "currentColor" : "none"} strokeWidth={1.5} />
                      ))}
                    </div>
                  )}
                  <blockquote className="mt-3 text-sm leading-relaxed text-foreground/90">&ldquo;{t.quote}&rdquo;</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    {t.imageUrl ? (
                      <Image src={t.imageUrl} alt={t.authorName} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy-50 text-xs font-medium text-brand-navy">
                        {t.authorName.charAt(0)}
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground">{t.authorName}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {faqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
          <h2 className="font-serif text-2xl font-medium text-brand-navy sm:text-3xl">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-6">
            {faqs.map((f) => (
              <AccordionItem key={f.id} value={f.id}>
                <AccordionTrigger>{f.question}</AccordionTrigger>
                <AccordionContent>{f.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}
    </div>
  );
}

function Hero({ banner }: { banner?: { title: string; subtitle: string | null; ctaText: string | null; ctaHref: string | null; imageUrl: string | null } }) {
  const title = banner?.title ?? "Stories worth printing, worth publishing.";
  const subtitle =
    banner?.subtitle ??
    "Physical books, e-books, and end-to-end self-publishing services — all under one roof.";
  const ctaText = banner?.ctaText ?? "Browse the catalogue";
  const ctaHref = banner?.ctaHref ?? "/self-publishing";

  return (
    <section className="relative overflow-hidden border-b border-border bg-brand-navy-solid">
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, rgba(255,255,255,0.9) 0, rgba(255,255,255,0.9) 1px, transparent 1px, transparent 34px)",
          maskImage: "linear-gradient(to bottom, transparent, black 20%, black 75%, transparent)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, black 20%, black 75%, transparent)",
        }}
      />
      {banner?.imageUrl && (
        <Image src={banner.imageUrl} alt="" fill priority className="object-cover opacity-25" />
      )}
      <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-6 px-5 py-20 sm:px-8 sm:py-28">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/50">
          Physical Books · E-Books · Self-Publishing
        </p>
        <h1 className="max-w-2xl font-serif text-4xl font-medium leading-[1.1] text-white sm:text-5xl">
          {title}
        </h1>
        <p className="max-w-lg text-base text-white/70">{subtitle}</p>
        <Button asChild size="lg" variant="accent">
          <Link href={ctaHref}>{ctaText}</Link>
        </Button>
      </div>
    </section>
  );
}

function ValueProps() {
  const items = [
    { Icon: Truck, title: "Nationwide shipping", body: "Physical editions packed and shipped across India." },
    { Icon: Download, title: "Instant e-book delivery", body: "Read on any device the moment your order is placed." },
    { Icon: PenLine, title: "Guided self-publishing", body: "From manuscript to marketplace, with royalties tracked for you." },
  ];

  return (
    <section className="mx-auto max-w-6xl px-5 py-12 sm:px-8">
      <div className="grid gap-6 sm:grid-cols-3">
        {items.map(({ Icon, title, body }) => (
          <div key={title} className="flex items-start gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-navy-50">
              <Icon className="h-[18px] w-[18px] text-brand-navy" strokeWidth={1.75} />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">{title}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{body}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
