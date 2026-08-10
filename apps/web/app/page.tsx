import { getContent, prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_BANNERS, SAMPLE_BOOKS, SAMPLE_EBOOKS, SAMPLE_FAQS, SAMPLE_TESTIMONIALS } from "@/lib/sample-data";
import { SectionHead, Stars, Wrap } from "@/components/primitives";
import { ProductScroller, ProductTile, type ProductTileData } from "@/components/commerce/product-tile";
import {
  DigitalTechBand,
  EducationalLearningBand,
  FaqList,
  Hero,
  LifestyleBand,
  Newsletter,
  ProfessionalProductsBand,
  PublishingBand,
  type ProductLineItem,
} from "@/components/marketing";

// FR-1.1: homepage featuring bestsellers, new releases, and promoted
// product lines.
//
// Every word a shopper reads on this page is admin-controlled. The hero comes
// from the first active `Banner` row (apps/admin: Homepage hero); testimonials
// and FAQs come from their own tables; and every remaining heading and
// description comes from `getContent()` (Homepage text), which merges the
// Publisher's overrides onto the copy this build shipped with.

/**
 * Each department band's linked items — labels and hrefs match the
 * department bar in lib/navigation.ts. Educational and Learning
 * deliberately excludes the general Books line (it already has its own
 * flagship shelf above), which is why it carries three items where the
 * department bar's dropdown carries four.
 */
const EDUCATIONAL_LEARNING_ITEMS: ProductLineItem[] = [
  { label: "Educational Charts", href: "/educational-charts" },
  { label: "Worksheets and Activity Puzzles", href: "/worksheets-activity-puzzles" },
  { label: "Teaching and Learning Materials", href: "/teaching-learning-materials" },
];

/** Placeholder photography for the three Educational and Learning tiles,
 * in the same order as EDUCATIONAL_LEARNING_ITEMS above — swap for real
 * product photography whenever it's shot. */
const EDUCATIONAL_LEARNING_IMAGES = [
  "/images/kindergarten-chart.png",
  "/images/activity-puzzle.png",
  "/images/teaching-kit.png",
];

const PROFESSIONAL_PRODUCT_ITEM: ProductLineItem = { label: "Advocate's Diary (Naya Bandhu)", href: "/advocate-diary" };
const PROFESSIONAL_PRODUCT_IMAGE = "/images/advocates-diary.png";

const DIGITAL_TECH_ITEMS: ProductLineItem[] = [
  { label: "Naya Bandhu (Application)", href: "/naya-bandhu" },
  { label: "Digital Tracking System", href: "/digital-tracking-system" },
];

const PUBLISHING_ITEMS: ProductLineItem[] = [
  { label: "Self Publishing", href: "/self-publishing" },
  { label: "Bulk Publishing", href: "/bulk-publishing" },
];

const LIFESTYLE_ITEM: ProductLineItem = { label: "Indoor Plants (Chatterjee's Green Veranda)", href: "/indoor-plants" };
const LIFESTYLE_IMAGE = "/images/indoor-plants.png";

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

      <EducationalLearningBand
        title={content["homepage.educationalLearning.title"]}
        body={content["homepage.educationalLearning.body"]}
        items={EDUCATIONAL_LEARNING_ITEMS}
        images={EDUCATIONAL_LEARNING_IMAGES}
      />

      <ProfessionalProductsBand
        title={content["homepage.professionalProducts.title"]}
        body={content["homepage.professionalProducts.body"]}
        item={PROFESSIONAL_PRODUCT_ITEM}
        image={PROFESSIONAL_PRODUCT_IMAGE}
      />

      <DigitalTechBand
        title={content["homepage.digitalTechSolutions.title"]}
        body={content["homepage.digitalTechSolutions.body"]}
        items={DIGITAL_TECH_ITEMS}
      />

      <PublishingBand
        title={content["homepage.publishing.title"]}
        body={content["homepage.publishing.body"]}
        items={PUBLISHING_ITEMS}
      />

      <LifestyleBand
        title={content["homepage.lifestyle.title"]}
        body={content["homepage.lifestyle.body"]}
        item={LIFESTYLE_ITEM}
        image={LIFESTYLE_IMAGE}
      />

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
