// Product/service verticals from the client's master PRD sheet
// (Ultimate_Master_PRD_All_Mandates.xlsx, "Website PRD Specifications").
// These are business verticals the current Prisma `Product` model doesn't
// represent yet (no schema for legal stationery, indoor plants, app
// downloads, or B2B tech-consultation leads) — see packages/database's
// schema.prisma `ProductType` enum. Until that data model exists, each
// vertical gets a static informational landing page at /catalog/[slug],
// linked from the header's hamburger menu.
//
// "flow" mirrors the sheet's "Functional Flow & Sales Logic" column and
// drives which call-to-action each catalog page shows:
//   - ecommerce: routes to a real storefront catalogue page that already sells this kind of item
//   - lead: routes to an inquiry/contact CTA (mailto, until a lead-capture form exists)
//   - licensing: routes to an app/portal access CTA (external link placeholder)

export type CatalogFlow = "ecommerce" | "lead" | "licensing";

export interface CatalogItem {
  serial: number;
  slug: string;
  title: string;
  category: string;
  subBrand?: string;
  flow: CatalogFlow;
  flowLabel: string;
  description: string;
  ctaLabel: string;
  ctaHref?: string; // present for "ecommerce" items with a real existing catalogue page
}

export const CATALOG_ITEMS: CatalogItem[] = [
  {
    serial: 1,
    slug: "books-for-primary-students",
    title: "Books for Primary Students",
    category: "Educational Materials",
    subBrand: "Ink & Imagination",
    flow: "ecommerce",
    flowLabel: "Automated e-commerce",
    description:
      "Published under the Ink & Imagination sub-brand. Direct shopping-cart checkout, with 25% of every sale contributed to the Sashibhusan Chattopadhyay Memorial Trust.",
    ctaLabel: "Browse physical books",
    ctaHref: "/books",
  },
  {
    serial: 2,
    slug: "educational-charts",
    title: "Educational Charts",
    category: "Educational Materials",
    subBrand: "Ink & Imagination",
    flow: "ecommerce",
    flowLabel: "Automated e-commerce",
    description:
      "Published under Ink & Imagination. Direct checkout via domestic payment aggregators, with 25% of sale volume allocated to trust initiatives.",
    ctaLabel: "Browse physical books",
    ctaHref: "/books",
  },
  {
    serial: 3,
    slug: "worksheets-and-activity-puzzles",
    title: "Worksheets and Activity Puzzles",
    category: "Educational Materials",
    subBrand: "Ink & Imagination",
    flow: "ecommerce",
    flowLabel: "Automated e-commerce",
    description:
      "Published under Ink & Imagination. Direct digital purchase, with 25% of sale volume going to the trust.",
    ctaLabel: "Browse physical books",
    ctaHref: "/books",
  },
  {
    serial: 4,
    slug: "teaching-and-learning-materials",
    title: "Teaching and Learning Materials",
    category: "Educational Materials",
    subBrand: "Ink & Imagination",
    flow: "ecommerce",
    flowLabel: "Automated e-commerce",
    description: "Published under Ink & Imagination. Transactional storefront listing, with 25% of sale volume contributed to the trust.",
    ctaLabel: "Browse physical books",
    ctaHref: "/books",
  },
  {
    serial: 5,
    slug: "law-books",
    title: "Law Books",
    category: "Legal Solutions Portfolio",
    flow: "ecommerce",
    flowLabel: "Automated e-commerce",
    description: "Online retail checkout, with 25% of sale volume pledged to the memorial trust fund.",
    ctaLabel: "Browse physical books",
    ctaHref: "/books",
  },
  {
    serial: 6,
    slug: "advocate-diary-naya-bandhu",
    title: "Advocate Diary (Naya Bandhu)",
    category: "Legal Solutions Portfolio",
    flow: "ecommerce",
    flowLabel: "Automated e-commerce",
    description: "Physical legal stationery with integrated shipping. 25% of sale volume is pledged to the trust.",
    ctaLabel: "Browse physical books",
    ctaHref: "/books",
  },
  {
    serial: 7,
    slug: "naya-bandhu-application",
    title: "Naya Bandhu (Application)",
    category: "Legal Solutions Portfolio",
    flow: "licensing",
    flowLabel: "Digital entitlement & licensing",
    description: "App-based legal productivity tools for advocates, with secure App Store / Play Store download access.",
    ctaLabel: "Get the app",
  },
  {
    serial: 8,
    slug: "indoor-plants-green-veranda",
    title: "Indoor Plants (Chatterjee's Green Veranda)",
    category: "Lifestyle & Nature",
    flow: "lead",
    flowLabel: "Structured lead acquisition",
    description:
      "Fosters environmental conservation and a connection with nature. Requests route as local booking/delivery inquiries, with 25% of sale volume pledged to the trust.",
    ctaLabel: "Request a callback",
  },
  {
    serial: 9,
    slug: "self-publishing-books-magazine",
    title: "Self Publishing Books & Magazine",
    category: "Author & Publishing Services",
    flow: "lead",
    flowLabel: "Structured lead acquisition",
    description: "A turnkey inquiry flow for new authors, supporting education and literacy goals. 25% of sale volume is contributed to the trust.",
    ctaLabel: "Start your project",
    ctaHref: "/self-publishing",
  },
  {
    serial: 10,
    slug: "website-development",
    title: "Website Development",
    category: "Digital & Tech Solutions",
    flow: "lead",
    flowLabel: "Structured lead acquisition",
    description: "A B2B service lead-acquisition funnel with secure custom input fields. 25% of sale volume is contributed to the trust.",
    ctaLabel: "Request a callback",
  },
  {
    serial: 11,
    slug: "digital-tracking-system",
    title: "Digital Tracking System",
    category: "Digital & Tech Solutions",
    flow: "licensing",
    flowLabel: "Digital entitlement & licensing",
    description: "Productivity software offered as a direct file entitlement or enterprise access credential. 25% of sale volume is contributed to the trust.",
    ctaLabel: "Request access",
  },
  {
    serial: 12,
    slug: "customized-digital-solutions",
    title: "Customized Digital Solutions",
    category: "Digital & Tech Solutions",
    flow: "lead",
    flowLabel: "Structured lead acquisition",
    description: "Custom tech-consultation inquiries routed directly to the backend admin system. 25% of sale volume is contributed to the trust.",
    ctaLabel: "Request a callback",
  },
];

export const CATALOG_CATEGORY_ORDER = [
  "Educational Materials",
  "Legal Solutions Portfolio",
  "Lifestyle & Nature",
  "Author & Publishing Services",
  "Digital & Tech Solutions",
];

export interface CatalogCategoryGroup {
  category: string;
  items: CatalogItem[];
}

export function groupCatalogItemsByCategory(): CatalogCategoryGroup[] {
  return CATALOG_CATEGORY_ORDER.map((category) => ({
    category,
    items: CATALOG_ITEMS.filter((item) => item.category === category),
  })).filter((group) => group.items.length > 0);
}

export function findCatalogItem(slug: string): CatalogItem | undefined {
  return CATALOG_ITEMS.find((item) => item.slug === slug);
}
