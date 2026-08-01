import Link from "next/link";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import {
  SAMPLE_BANNERS,
  SAMPLE_BOOKS,
  SAMPLE_EBOOKS,
  SAMPLE_FAQS,
  SAMPLE_SERVICES,
  SAMPLE_TESTIMONIALS,
} from "@/lib/sample-data";
import { CLASS_SET_TIERS, tierUnitCents } from "@/lib/pricing";
import { formatINRWhole } from "@/lib/format";
import { Callout, SectionHead, Stars, Wrap, buttonClass } from "@/components/primitives";
import { ProductScroller, ProductTile, type ProductTileData } from "@/components/commerce/product-tile";
import {
  CategoryCircles,
  FaqList,
  Hero,
  Newsletter,
  PlanBand,
  TrustBand,
  type CategoryCircle,
} from "@/components/marketing";

// FR-1.1: homepage featuring bestsellers, new releases, and promoted
// services. The hero banner, testimonials and FAQs are admin-controlled
// (apps/admin: Homepage Banners / Testimonials / FAQs); everything falls
// back to sample data when no database is reachable.

const CATEGORY_CIRCLES: CategoryCircle[] = [
  { label: "Literary Fiction", href: "/books?genre=Literary%20Fiction", glyph: "✒", from: "#3b53b8", to: "#22307a" },
  { label: "Fantasy", href: "/books?genre=Fantasy", glyph: "⚔", from: "#2f8b52", to: "#1c5733" },
  { label: "Sci-Fi", href: "/books?genre=Sci-Fi", glyph: "◎", from: "#0f8a95", to: "#0a5960" },
  { label: "Poetry", href: "/books?genre=Poetry", glyph: "❦", from: "#7a44b0", to: "#4a2870" },
  { label: "Non-Fiction", href: "/books?genre=Non-Fiction", glyph: "▦", from: "#c05f1c", to: "#7d3c11" },
  { label: "Children's", href: "/catalog/books-for-primary-students", glyph: "★", from: "#7d9420", to: "#4e5c14" },
  { label: "E-Books", href: "/ebooks", glyph: "◫", from: "#b02a86", to: "#6e1a53" },
  { label: "Author Services", href: "/services", glyph: "✎", from: "#b08600", to: "#6f5400" },
  { label: "Self-Publishing", href: "/self-publishing", glyph: "▲", from: "#bd3140", to: "#7c1f2a" },
];

export default async function HomePage() {
  const [books, ebooks, services, banners, testimonials, faqs] = await Promise.all([
    withFallback(
      () =>
        prisma.product.findMany({
          where: { type: "PHYSICAL_BOOK", isPublished: true },
          orderBy: { createdAt: "desc" },
          take: 24,
        }),
      SAMPLE_BOOKS
    ),
    withFallback(
      () =>
        prisma.product.findMany({ where: { type: "EBOOK", isPublished: true }, orderBy: { createdAt: "desc" }, take: 24 }),
      SAMPLE_EBOOKS
    ),
    withFallback(
      () =>
        prisma.product.findMany({
          where: { type: "SERVICE_PACKAGE", isPublished: true },
          orderBy: { priceCents: "asc" },
        }),
      SAMPLE_SERVICES
    ),
    withFallback(() => prisma.banner.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }), SAMPLE_BANNERS),
    withFallback(
      () => prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
      SAMPLE_TESTIMONIALS
    ),
    withFallback(() => prisma.faq.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }), SAMPLE_FAQS),
  ]);

  const allBooks = books as ProductTileData[];
  const ebookPrice = new Map(
    (ebooks as ProductTileData[]).map((ebook) => [ebook.slug.replace(/-ebook$/, ""), ebook.priceCents])
  );

  const popular = [...allBooks].sort((a, b) => (b.reviewCount ?? 0) - (a.reviewCount ?? 0)).slice(0, 8);
  const banner = banners[0];

  return (
    <>
      <Hero
        eyebrow="New this season"
        title={banner?.title ?? "Your story, published your way."}
        standfirst={
          banner?.subtitle ??
          "Shop the catalogue, commission an e-book conversion, or launch your own title — manuscript to storefront listing in as little as three weeks."
        }
        primary={{ label: banner?.ctaText ?? "Start self-publishing", href: banner?.ctaHref ?? "/self-publishing" }}
        secondary={{ label: "Shop books", href: "/books" }}
        jackets={allBooks.slice(0, 4).map((book) => ({
          title: book.title,
          author: book.author,
          from: book.coverFrom,
          to: book.coverTo,
        }))}
      />

      <Wrap as="section" className="pb-4 pt-12">
        <SectionHead title="Explore all categories" href="/books" />
        <CategoryCircles categories={CATEGORY_CIRCLES} />
      </Wrap>

      <Wrap as="section" className="py-8">
        <SectionHead
          title="Our most popular titles"
          standfirst="What readers are ordering most this week."
          href="/books"
        />
        <ProductScroller>
          {popular.map((product, index) => (
            <ProductTile
              key={product.id}
              product={product}
              flag={index === 0 ? { label: "Bestseller" } : index === 2 ? { label: "New", tone: "tile" } : undefined}
              ebookCents={ebookPrice.get(product.slug)}
            />
          ))}
        </ProductScroller>
      </Wrap>

      <TrustBand />

      <ClassSetBand />

      <PlanBand
        eyebrow="Author services"
        title="Publish it yourself — we'll guide you."
        standfirst="Every package takes your manuscript to a finished e-book. Add a printed edition, ISBN registration, and a storefront listing whenever you're ready."
        plans={(services as ServiceLike[]).map((service, index) => ({
          tag: index === 1 ? "Most popular" : undefined,
          title: service.title,
          price: formatINRWhole(service.priceCents),
          meta: service.turnaroundDays != null ? `${service.turnaroundDays}-day turnaround` : undefined,
          points: (service.description ?? "").split("\n").filter(Boolean).slice(0, 4),
          cta: { label: `Choose ${service.title.split(" ")[0]}`, href: `/services/${service.slug}` },
          featured: index === 1,
        }))}
      />

      {testimonials.length > 0 && (
        <Wrap as="section" className="py-12">
          <SectionHead title="From our readers & authors" />
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            {testimonials.map((testimonial) => (
              <figure key={testimonial.id} className="m-0 rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
                <Stars rating={testimonial.rating ?? 5} />
                <blockquote className="mt-3.5 text-base leading-[1.55]">{testimonial.quote}</blockquote>
                <figcaption className="mt-4 text-sm font-bold">{testimonial.authorName}</figcaption>
              </figure>
            ))}
          </div>
        </Wrap>
      )}

      <Newsletter />

      {faqs.length > 0 && (
        <Wrap as="section" className="py-12">
          <SectionHead title="Common questions" />
          <FaqList items={faqs} />
        </Wrap>
      )}
    </>
  );
}

/** Only the fields the band renders — works with a Prisma row or sample data. */
interface ServiceLike {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  description: string | null;
  turnaroundDays: number | null;
}

/**
 * The quantity-tier mechanic, retargeted at class sets. Schools order one
 * title in bulk, so the per-copy price is shown falling as the tier rises
 * — no quote, no waiting on a rep.
 */
function ClassSetBand() {
  const base = 49_900;

  return (
    <Wrap as="section" className="py-12">
      <div className="rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
        <div className="grid gap-7 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          <div>
            <Callout>Class sets</Callout>
            <h2 className="mt-3.5">Buy more, save more.</h2>
            <p className="mt-3 max-w-[42ch] text-base leading-[1.55] text-ink-muted">
              Schools and reading groups order the same title in quantity. Pick a tier — the per-copy price drops
              automatically. No quote, no waiting on a rep.
            </p>
            <Link href="/books" className={buttonClass("primary", "md", "mt-5")}>
              Shop class sets
            </Link>
          </div>

          <div>
            <p className="caps mb-2.5 text-ink-muted">Books for Primary Students · per copy</p>
            <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(134px,1fr))]">
              {CLASS_SET_TIERS.map((tier) => (
                <div
                  key={tier.quantity}
                  className="rounded-btn bg-ground px-3.5 py-3 inset-ring-2 inset-ring-line-strong"
                >
                  <span className="caps block">Buy {tier.quantity}</span>
                  <span className="mt-1 block text-lg font-bold tracking-[-0.02em] tabular-nums">
                    {formatINRWhole(tierUnitCents(base, tier.discount))}
                  </span>
                  <span className="mt-px block text-xs font-bold text-ok">
                    {tier.discount > 0 ? `Save ${Math.round(tier.discount * 100)}%` : " "}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3.5 text-sm text-ink-muted">
              MRP (inclusive of all taxes). Delivery billed at checkout.
            </p>
          </div>
        </div>
      </div>
    </Wrap>
  );
}
