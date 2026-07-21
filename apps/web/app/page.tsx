import Link from "next/link";
import Image from "next/image";
import { Star, BookOpen, Tablet, Target, PenLine, ArrowRight } from "lucide-react";
import { prisma } from "@repo/database";
import { Button } from "@repo/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@repo/ui/accordion";
import { ProductCard } from "@/components/product-card";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_PRODUCTS, SAMPLE_BANNERS, SAMPLE_TESTIMONIALS, SAMPLE_FAQS, SAMPLE_CATEGORIES } from "@/lib/sample-data";

const categoryStyle = {
  "Physical Books": { Icon: BookOpen, badge: "bg-brand-navy-50 text-brand-navy", hover: "group-hover:bg-brand-navy-solid" },
  "E-Books": { Icon: Tablet, badge: "bg-brand-accent-50 text-brand-accent", hover: "group-hover:bg-brand-accent-solid" },
  "Publishing Services": { Icon: Target, badge: "bg-amber-500/10 text-amber-600", hover: "group-hover:bg-amber-500" },
  "Self-Publishing": { Icon: PenLine, badge: "bg-emerald-600/10 text-emerald-700", hover: "group-hover:bg-emerald-600" },
} as const;

const trustItems = [
  { title: "Nationwide shipping", body: "Physical editions packed and shipped across India." },
  { title: "Instant e-book delivery", body: "Read on any device the moment your order is placed." },
  { title: "Guided self-publishing", body: "From manuscript to marketplace, with royalties tracked for you." },
];

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
    <div className="bg-brand-cream dark:bg-background">
      <Hero banner={heroBanner} />

      <section className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl font-medium text-brand-navy sm:text-3xl">Explore the storefront</h2>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-4">
          {SAMPLE_CATEGORIES.map((cat) => {
            const { Icon, badge, hover } = categoryStyle[cat.title as keyof typeof categoryStyle];
            return (
              <Link
                key={cat.title}
                href={cat.href}
                className="group rounded-xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors group-hover:text-white ${badge} ${hover}`}>
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <p className="mt-3.5 text-sm font-semibold text-foreground">{cat.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{cat.body}</p>
              </Link>
            );
          })}
        </div>

        <div className="mt-12 grid gap-7 border-t border-border pt-10 sm:grid-cols-3">
          {trustItems.map((item) => (
            <div key={item.title} className="flex items-start gap-3.5">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {restBanners.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-14 sm:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {restBanners.map((banner) => (
              <div key={banner.id} className="rounded-xl border border-border bg-card p-5">
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
        <section className="border-t border-border bg-muted py-16">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <h2 className="font-serif text-2xl font-medium text-brand-navy sm:text-3xl">What readers say</h2>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="rounded-2xl border border-border bg-card p-6">
                  {t.rating && (
                    <div className="flex gap-0.5 text-amber-500">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-3.5 w-3.5" fill={i < t.rating! ? "currentColor" : "none"} strokeWidth={1.5} />
                      ))}
                    </div>
                  )}
                  <blockquote className="mt-3 font-serif text-sm italic leading-relaxed text-foreground/90">&ldquo;{t.quote}&rdquo;</blockquote>
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
    <section className="relative overflow-hidden bg-gradient-to-b from-[#000000] to-[#021743] text-center">
      {banner?.imageUrl && (
        <Image src={banner.imageUrl} alt="" fill priority className="object-cover opacity-25" />
      )}
      <div className="relative mx-auto flex max-w-[760px] flex-col items-center gap-[22px] px-5 py-[88px] sm:px-8">
        <p className="text-[13px] font-semibold uppercase tracking-[2.5px] text-amber-400">
          Physical Books · E-Books · Self-Publishing
        </p>
        <h1 className="max-w-2xl font-serif text-[38px] font-semibold leading-[1.15] text-white sm:text-[52px]">
          {title}
        </h1>
        <p className="max-w-[560px] text-[17px] leading-[1.6] text-white/85">{subtitle}</p>
        <Button
          asChild
          size="lg"
          className="mt-2 rounded-lg bg-[#6f2419] px-8 py-[15px] text-[15px] shadow-lg shadow-black/35 hover:bg-[#82301f]"
        >
          <Link href={ctaHref}>{ctaText}</Link>
        </Button>
      </div>
    </section>
  );
}
