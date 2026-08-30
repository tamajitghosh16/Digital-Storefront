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
 * The demo catalogue, written the way the admin's product form writes a
 * book: **one row per title**, with `bookFormats: [PHYSICAL, EBOOK]` and the
 * two prices on that single row — not a printed row plus a separate
 * "(E-Book)" row. That's what makes the admin's Books list and the
 * storefront (which groups its two sample editions back into one listing)
 * show the same 100 titles instead of two different catalogues.
 *
 * `update` carries the same fields as `create` on purpose: re-running the
 * seed after a schema or price change corrects existing rows rather than
 * silently leaving them stale. It only ever touches these 100 slugs, so
 * anything added by hand from the admin is left alone.
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
      // Curated merchandising label — "Best Selling" / "Coming Soon" / "Out
      // of Stock" — set on a handful of demo titles, null for the rest. The
      // "Coming Soon" ones are what seedProcurement() raises purchase orders
      // for below.
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

/**
 * Ten sample suppliers for the admin's "All Vendors" page, plus one open
 * purchase order per "Coming Soon" title for the "Purchase Orders" page —
 * a print run raised against a vendor and marked SENT (ordered, not yet
 * received), which is what "Coming Soon" means operationally.
 *
 * Idempotent like the rest of the seed: vendors upsert on a fixed id,
 * purchase orders on a fixed `po-<slug>` id with `update: {}` so a re-run
 * leaves any received quantities alone.
 */
const VENDOR_SEEDS = [
  { id: "vendor-01", name: "Sagar Printers & Binders", contactName: "Ramesh Sagar", phone: "+91 98300 11221", email: "orders@sagarprinters.in", gstin: "19AabsC1234F1Z5", city: "Kolkata", state: "West Bengal" },
  { id: "vendor-02", name: "Ananda Paper Mills", contactName: "Sujata Bose", phone: "+91 98311 44556", email: "sales@anandapaper.com", gstin: "19AAdCA5678G1Z2", city: "Howrah", state: "West Bengal" },
  { id: "vendor-03", name: "Deshbandhu Offset Press", contactName: "Kartik Dey", phone: "+91 90514 77889", email: "hello@deshbandhuoffset.in", gstin: "19AAeCD9012H1Z9", city: "Kolkata", state: "West Bengal" },
  { id: "vendor-04", name: "Rainbow Colour Litho", contactName: "Farhan Ali", phone: "+91 98745 20034", email: "print@rainbowlitho.in", gstin: "19AAfCR3456J1Z7", city: "Siliguri", state: "West Bengal" },
  { id: "vendor-05", name: "Gitanjali Printing House", contactName: "Anita Chatterjee", phone: "+91 93300 65432", email: "accounts@gitanjaliprint.in", gstin: "19AAgCG7890K1Z4", city: "Durgapur", state: "West Bengal" },
  { id: "vendor-06", name: "Bharati Book Manufacturers", contactName: "Deepak Nair", phone: "+91 99030 12876", email: "supply@bharatibooks.co.in", gstin: "27AAhCB2345L1Z1", city: "Mumbai", state: "Maharashtra" },
  { id: "vendor-07", name: "Sunrise Graphics", contactName: "Meera Iyer", phone: "+91 90080 33421", email: "info@sunrisegraphics.in", gstin: "29AAiCS6789M1Z8", city: "Bengaluru", state: "Karnataka" },
  { id: "vendor-08", name: "National Paper Traders", contactName: "Harpreet Singh", phone: "+91 98110 55490", email: "desk@nationalpaper.in", gstin: "07AAjCN0123N1Z6", city: "New Delhi", state: "Delhi" },
  { id: "vendor-09", name: "Kaveri Print Solutions", contactName: "Lakshmi Rao", phone: "+91 94440 88123", email: "orders@kaveriprint.in", gstin: "33AAkCK4567P1Z3", city: "Chennai", state: "Tamil Nadu" },
  { id: "vendor-10", name: "Everest Packaging & Print", contactName: "Nilesh Patil", phone: "+91 90099 71234", email: "sales@everestpack.in", gstin: "24AAlCE8901Q1Z0", city: "Ahmedabad", state: "Gujarat" },
];

async function seedProcurement() {
  for (const { id, ...vendor } of VENDOR_SEEDS) {
    await prisma.vendor.upsert({
      where: { id },
      update: vendor,
      create: { id, ...vendor },
    });
  }

  const comingSoonSlugs = BOOK_SEEDS.filter((b) => b.inventoryStatus === "COMING_SOON").map((b) => b.slug);
  const comingSoonProducts = await prisma.product.findMany({ where: { slug: { in: comingSoonSlugs } } });

  let poCount = 0;
  for (const [i, product] of comingSoonProducts.entries()) {
    const vendor = VENDOR_SEEDS[i % VENDOR_SEEDS.length]!;
    const quantityOrdered = 250;
    // Trade cost ~45% of the list price, rounded to the rupee.
    const unitCostCents = Math.round((product.priceCents * 0.45) / 100) * 100;
    const expectedAt = new Date();
    expectedAt.setDate(expectedAt.getDate() + 21);

    await prisma.purchaseOrder.upsert({
      where: { id: `po-${product.slug}` },
      update: {},
      create: {
        id: `po-${product.slug}`,
        vendorId: vendor.id,
        status: "SENT",
        expectedAt,
        notes: `Initial print run for "${product.title}" — launch title, still marked Coming Soon on the storefront.`,
        totalCents: quantityOrdered * unitCostCents,
        items: {
          create: [{ productId: product.id, quantityOrdered, unitCostCents }],
        },
      },
    });
    poCount += 1;
  }

  return { vendors: VENDOR_SEEDS.length, purchaseOrders: poCount };
}

async function main() {
  const bookCount = await seedBookCatalogue();
  const procurement = await seedProcurement();

  const physicalBook = await prisma.product.upsert({
    where: { slug: "geographic-atlas-of-bengal" },
    update: {},
    create: {
      type: "PHYSICAL_BOOK",
      productLine: "BOOK",
      title: "Geographic Atlas of Bengal",
      author: "Shashibhushan Book Press",
      slug: "geographic-atlas-of-bengal",
      description: "A landmark geographic atlas from the Press's publishing history.",
      priceCents: 149900,
      stockQty: 25,
      isbn: "978-0000000000",
    },
  });

  const ebook = await prisma.product.upsert({
    where: { slug: "geographic-atlas-of-bengal-ebook" },
    update: {},
    create: {
      type: "EBOOK",
      productLine: "BOOK",
      title: "Geographic Atlas of Bengal (E-Book)",
      author: "Shashibhushan Book Press",
      slug: "geographic-atlas-of-bengal-ebook",
      priceCents: 89900,
      formats: ["EPUB", "PDF"],
    },
  });

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
    physicalBook: physicalBook.id,
    ebook: ebook.id,
    servicePackage: servicePackage.id,
    ...procurement,
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
