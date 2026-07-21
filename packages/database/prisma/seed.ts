/**
 * Minimal dev-data seed. Run with `pnpm db:seed` (wire up a "seed" script /
 * prisma.seed config once this repo has its first migration applied).
 */
import { prisma, SITE_SETTINGS_ID } from "../src/client";

async function main() {
  const physicalBook = await prisma.product.upsert({
    where: { slug: "geographic-atlas-of-bengal" },
    update: {},
    create: {
      type: "PHYSICAL_BOOK",
      title: "Geographic Atlas of Bengal",
      author: "Shashibhushan Chattopadhyay",
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
      title: "Geographic Atlas of Bengal (E-Book)",
      author: "Shashibhushan Chattopadhyay",
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
    { label: "Physical Books", href: "/books", order: 0 },
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

  await prisma.banner.upsert({
    where: { id: "banner-welcome" },
    update: {},
    create: {
      id: "banner-welcome",
      title: "New & Featured",
      subtitle: "Fresh releases from the Press, curated every week.",
      ctaText: "Browse Physical Books",
      ctaHref: "/books",
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

  console.log({ physicalBook: physicalBook.id, ebook: ebook.id, servicePackage: servicePackage.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
