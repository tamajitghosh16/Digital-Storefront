/**
 * Minimal dev-data seed. Run with `pnpm db:seed` (wire up a "seed" script /
 * prisma.seed config once this repo has its first migration applied).
 */
// Loads packages/database/.env — unlike the Prisma CLI (prisma.config.ts
// does this itself), tsx running this file directly won't pick up
// DATABASE_URL otherwise, and ../src/client builds its PrismaPg adapter
// from that env var at import time.
import "dotenv/config";
import { prisma, BOOK_SEEDS, PRICING_SETTINGS_ID, SITE_SETTINGS_ID } from "../src/client";

/**
 * Writes the book catalogue the way the admin's product form writes a
 * book: **one row per title**, with `bookFormats: [PHYSICAL, EBOOK]` and the
 * two prices on that single row — not a printed row plus a separate
 * "(E-Book)" row.
 *
 * `BOOK_SEEDS` is empty for the testing phase (see
 * `packages/database/src/book-catalog.ts`), so this is currently a no-op —
 * real inventory is entered from the admin. Re-populate `BOOK_SEEDS` to
 * seed a demo catalogue again; `update` carries the same fields as `create`
 * on purpose, so a re-run corrects existing seeded rows rather than leaving
 * them stale, and only ever touches the seeded slugs.
 */
async function seedBookCatalogue() {
  for (const book of BOOK_SEEDS) {
    const data = {
      type: "PHYSICAL_BOOK" as const,
      productLine: "BOOK" as const,
      bookFormats: ["PHYSICAL", "EBOOK"] as const,
      title: book.title,
      author: book.author,
      description: `${book.description}\n\n${book.pages} pages.`,
      priceCents: book.physicalPriceCents,
      ebookPriceCents: book.ebookPriceCents,
      stockQty: book.stockQty,
      isbn: book.isbn,
      weightGrams: 320,
      genre: book.genre,
      ratingAvg: book.rating,
      reviewCount: book.reviewCount,
      inventoryStatus: book.inventoryStatus ?? null,
      formats: ["EPUB", "MOBI", "PDF"],
      isPublished: true,
    };
    await prisma.product.upsert({
      where: { slug: book.slug },
      update: data,
      create: { ...data, slug: book.slug, publishedAt: new Date() },
    });
  }
  return BOOK_SEEDS.length;
}

async function main() {
  const bookCount = await seedBookCatalogue();

  const servicePackage = await prisma.product.upsert({
    where: { slug: "premium-design-package" },
    update: {},
    create: {
      type: "SERVICE_PACKAGE",
      title: "Premium Design Package",
      author: "In-house",
      slug: "premium-design-package",
      description: "Custom cover design, advanced formatting, two rounds of revisions, multi-format delivery.",
      priceCents: 899900,
      turnaroundDays: 21,
    },
  });

  // CMS content — sample rows so a fresh checkout of apps/web isn't blank
  // before anyone has touched the admin Site Settings / Navigation /
  // Banners / FAQ / Testimonials screens.
  await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    update: {},
    create: {
      id: SITE_SETTINGS_ID,
      siteName: "Shashibhushan's New School Book Press",
      tagline: "Physical books, e-books, and self-publishing services since 1932.",
      metaTitle: "Shashibhushan's New School Book Press",
      metaDescription: "Physical books, e-books, self-publishing, and e-book creation services.",
      contactEmail: "orders@yourdomain.com",
      socialLinks: { twitter: "", facebook: "", instagram: "" },
    },
  });

  const headerLinks = [
    { label: "Books", href: "/books", order: 0 },
    { label: "E-Books", href: "/ebooks", order: 1 },
    { label: "Publishing Services", href: "/services", order: 2 },
    { label: "Self-Publishing", href: "/self-publishing", order: 3 },
    { label: "Cart", href: "/cart", order: 4 },
    { label: "Account", href: "/account", order: 5 },
  ];
  for (const link of headerLinks) {
    await prisma.navLink.upsert({
      where: { id: `header-${link.href}` },
      update: {},
      create: { id: `header-${link.href}`, location: "HEADER", ...link },
    });
  }

  const footerLinks = [
    { label: "Self-Publishing", href: "/self-publishing", order: 0 },
    { label: "Order History", href: "/account/orders", order: 1 },
    { label: "Contact", href: "mailto:orders@yourdomain.com", order: 2 },
  ];
  for (const link of footerLinks) {
    await prisma.navLink.upsert({
      where: { id: `footer-${link.href}` },
      update: {},
      create: { id: `footer-${link.href}`, location: "FOOTER", ...link },
    });
  }

  // The first active banner *is* the homepage hero, so seed a complete one —
  // it gives the Publisher something to edit on their first visit to the
  // admin's Homepage hero screen instead of an empty list.
  await prisma.banner.upsert({
    where: { id: "banner-welcome" },
    update: {},
    create: {
      id: "banner-welcome",
      eyebrow: "Knowledge that builds better citizens and better professionals",
      title: "Your story, published your way.",
      subtitle:
        "Shop the catalogue, commission an e-book conversion, or launch your own title — manuscript to storefront listing in as little as three weeks.",
      ctaText: "Start self-publishing",
      ctaHref: "/self-publishing",
      secondaryCtaText: "Shop books",
      secondaryCtaHref: "/books",
      order: 0,
    },
  });

  await prisma.faq.upsert({
    where: { id: "faq-shipping" },
    update: {},
    create: {
      id: "faq-shipping",
      question: "How long does shipping take?",
      answer: "Physical book orders typically ship within 3-5 business days.",
      order: 0,
    },
  });
  await prisma.faq.upsert({
    where: { id: "faq-selfpub" },
    update: {},
    create: {
      id: "faq-selfpub",
      question: "How does self-publishing work?",
      answer: "Submit your manuscript, choose a package, and our team guides you through production to publication.",
      order: 1,
    },
  });

  await prisma.testimonial.upsert({
    where: { id: "testimonial-1" },
    update: {},
    create: {
      id: "testimonial-1",
      authorName: "Ananya R.",
      quote: "The self-publishing team turned my manuscript into a beautiful finished book.",
      rating: 5,
      order: 0,
    },
  });

  // Pricing rules. These match the numbers apps/web used to hardcode, so a
  // freshly seeded database behaves exactly like the pre-CMS storefront until
  // someone changes them from the admin. `ContentBlock` is deliberately *not*
  // seeded: an absent row means "use the copy this build shipped with".
  await prisma.pricingSettings.upsert({
    where: { id: PRICING_SETTINGS_ID },
    update: {},
    create: { id: PRICING_SETTINGS_ID },
  });

  for (const tier of [
    { quantity: 10, discountBps: 1000 },
    { quantity: 30, discountBps: 1800 },
    { quantity: 100, discountBps: 2400 },
  ]) {
    await prisma.classSetTier.upsert({
      where: { quantity: tier.quantity },
      update: {},
      create: tier,
    });
  }

  await prisma.discountCode.upsert({
    where: { code: "SCHOOL5" },
    update: {},
    create: { code: "SCHOOL5", rateBps: 500, blurb: "5% off this order." },
  });

  console.log({
    books: bookCount,
    servicePackage: servicePackage.id,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
