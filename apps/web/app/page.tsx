import Link from "next/link";
import { getContent, prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_BANNERS, SAMPLE_BOOKS, SAMPLE_EBOOKS, SAMPLE_FAQS, SAMPLE_TESTIMONIALS } from "@/lib/sample-data";
import { SectionHead, Stars, Wrap } from "@/components/primitives";
import { ProductScroller, ProductTile, type ProductTileData } from "@/components/commerce/product-tile";
import { FaqList, Hero, Newsletter } from "@/components/marketing";

// FR-1.1: homepage featuring bestsellers, new releases, and promoted
// product lines.
//
// Every word a shopper reads on this page is admin-controlled. The hero comes
// from the first active `Banner` row (apps/admin: Homepage hero); testimonials
// and FAQs come from their own tables; and every remaining heading and
// description comes from `getContent()` (Homepage text), which merges the
// Publisher's overrides onto the copy this build shipped with.

/**
 * Each product-line band's icon, colour and row of linked cards — labels
 * and hrefs match the department bar in lib/navigation.ts. Glyph/colour
 * pairs follow the same gradient-circle language the removed category
 * circles used, so these bands read as part of the same design system.
 */
const PRODUCT_LINE_BANDS = [
  {
    contentKey: "educationalLearning",
    glyph: "🎓",
    from: "#3b53b8",
    to: "#22307a",
    items: [
      { label: "Educational Charts", href: "/educational-charts" },
      { label: "Worksheets and Activity Puzzles", href: "/worksheets-activity-puzzles" },
      { label: "Teaching and Learning Materials", href: "/teaching-learning-materials" },
    ],
  },
  {
    contentKey: "professionalProducts",
    glyph: "⚖",
    from: "#bd3140",
    to: "#7c1f2a",
    items: [{ label: "Advocate's Diary (Naya Bandhu)", href: "/advocate-diary" }],
  },
  {
    contentKey: "digitalTechSolutions",
    glyph: "◫",
    from: "#0f8a95",
    to: "#0a5960",
    items: [
      { label: "Naya Bandhu (Application)", href: "/naya-bandhu" },
      { label: "Digital Tracking System", href: "/digital-tracking-system" },
    ],
  },
  {
    contentKey: "publishing",
    glyph: "✎",
    from: "#b08600",
    to: "#6f5400",
    items: [
      { label: "Self Publishing", href: "/self-publishing" },
      { label: "Bulk Publishing", href: "/bulk-publishing" },
    ],
  },
  {
    contentKey: "lifestyle",
    glyph: "❧",
    from: "#2f8b52",
    to: "#1c5733",
    items: [{ label: "Indoor Plants (Chatterjee's Green Veranda)", href: "/indoor-plants" }],
  },
] as const;

export default async function HomePage() {
  const [books, ebooks, banners, testimonials, faqs, content] = await Promise.all([
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
    withFallback(() => prisma.banner.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }), SAMPLE_BANNERS),
    withFallback(
      () => prisma.testimonial.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
      SAMPLE_TESTIMONIALS
    ),
    withFallback(() => prisma.faq.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }), SAMPLE_FAQS),
    getContent(),
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
        eyebrow={banner?.eyebrow ?? undefined}
        title={banner?.title ?? "Your story, published your way."}
        standfirst={
          banner?.subtitle ??
          "Shop the catalogue, commission an e-book conversion, or launch your own title — manuscript to storefront listing in as little as three weeks."
        }
        primary={banner?.ctaText ? { label: banner.ctaText, href: banner.ctaHref ?? "/self-publishing" } : undefined}
        secondary={
          banner?.secondaryCtaText
            ? { label: banner.secondaryCtaText, href: banner.secondaryCtaHref ?? "/books" }
            : undefined
        }
        jackets={allBooks.slice(0, 4).map((book) => ({
          title: book.title,
          author: book.author,
          from: book.coverFrom,
          to: book.coverTo,
        }))}
      />

      <Wrap as="section" className="py-8">
        <SectionHead
          title={content["homepage.popular.title"]}
          standfirst={content["homepage.popular.standfirst"]}
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

      <Wrap as="section" className="flex flex-col gap-4 py-8">
        {PRODUCT_LINE_BANDS.map((band) => (
          <ProductLineBand
            key={band.contentKey}
            glyph={band.glyph}
            from={band.from}
            to={band.to}
            title={content[`homepage.${band.contentKey}.title` as const]}
            body={content[`homepage.${band.contentKey}.body` as const]}
            items={band.items}
          />
        ))}
      </Wrap>

      {testimonials.length > 0 && (
        <Wrap as="section" className="py-12">
          <SectionHead title={content["homepage.testimonials.title"]} />
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

      <Newsletter
        title={content["homepage.newsletter.title"]}
        body={content["homepage.newsletter.body"]}
        placeholder={content["homepage.newsletter.placeholder"]}
        buttonLabel={content["homepage.newsletter.buttonLabel"]}
      />

      {faqs.length > 0 && (
        <Wrap as="section" className="py-12">
          <SectionHead title={content["homepage.faq.title"]} />
          <FaqList items={faqs} />
        </Wrap>
      )}
    </>
  );
}

/**
 * A gradient icon circle, heading and description, and a grid of linked
 * cards to that line's product pages — the same tile-in-a-tinted-band
 * language the class-set and trust bands use elsewhere on this page.
 */
function ProductLineBand({
  glyph,
  from,
  to,
  title,
  body,
  items,
}: {
  glyph: string;
  from: string;
  to: string;
  title: string;
  body: string;
  items: readonly { label: string; href: string }[];
}) {
  return (
    <div className="rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge min-[700px]:p-7">
      <div className="flex flex-wrap items-start gap-4">
        <span
          aria-hidden
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-[26px] leading-none text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)]"
          style={{ backgroundImage: `linear-gradient(155deg, ${from}, ${to})` }}
        >
          {glyph}
        </span>
        <div className="min-w-0 flex-1">
          <h2>{title}</h2>
          <p className="mt-1.5 max-w-[62ch] text-[15px] leading-[1.55] text-ink-muted">{body}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex items-center justify-between gap-2 rounded-btn bg-ground px-4 py-3.5 text-sm font-bold transition-colors hover:bg-tile-2 inset-ring inset-ring-card-edge"
          >
            {item.label}
            <span aria-hidden className="text-ink-subtle transition-transform group-hover:translate-x-0.5">
              →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
