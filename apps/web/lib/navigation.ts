import { CATALOG_CATEGORY_ORDER, groupCatalogItemsByCategory } from "./catalog";

/**
 * The department bar and its hover panels.
 *
 * The approved design promotes the five PRD verticals to top-level
 * departments alongside the four trading lines, each with a panel that
 * opens on hover. The model is plain serialisable data so the bar can
 * stay a Server Component — the panels are CSS-driven, not stateful.
 */

export interface NavLeaf {
  label: string;
  href: string;
  /** Small muted note under the label — a price, a device, a turnaround. */
  note?: string;
}

export interface NavColumn {
  title: string;
  items: NavLeaf[];
}

export interface NavPromo {
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
  /** Filled brand button on the primary departments, outlined elsewhere. */
  emphasis?: "primary" | "secondary";
}

export interface Department {
  label: string;
  href: string;
  columns?: NavColumn[];
  promo?: NavPromo;
}

export const BOOK_GENRES = [
  "Literary Fiction",
  "Fantasy",
  "Sci-Fi",
  "Poetry",
  "Non-Fiction",
  "Historical Fiction",
  "Thriller",
] as const;

/** Bar labels for the PRD verticals — the full names are set as page titles. */
const SHORT_LABELS: Record<string, string> = {
  "Legal Solutions Portfolio": "Legal Solutions",
  "Digital & Tech Solutions": "Digital & Tech",
};

const BINDINGS: NavLeaf[] = [
  { label: "Paperback", href: "/books", note: "Standard" },
  { label: "Hardcover", href: "/books", note: "Case-bound" },
  { label: "Spiral", href: "/books", note: "Workbooks" },
  { label: "Large print", href: "/books" },
];

export function buildDepartments(): Department[] {
  const catalogGroups = groupCatalogItemsByCategory();

  const allProducts: Department = {
    label: "All Products",
    href: "/books",
    columns: catalogGroups.map((group) => ({
      title: group.category,
      items: group.items.map((item) => ({
        label: item.title,
        href: `/catalog/${item.slug}`,
        note: item.subBrand,
      })),
    })),
  };

  const books: Department = {
    label: "Books",
    href: "/books",
    columns: [
      {
        title: "Shop by genre",
        items: BOOK_GENRES.map((genre) => ({
          label: genre,
          href: `/books?genre=${encodeURIComponent(genre)}`,
        })),
      },
      {
        title: "Collections",
        items: [
          { label: "New arrivals", href: "/books?sort=new" },
          { label: "Highest rated", href: "/books?sort=rating" },
          { label: "Under ₹2,000", href: "/books?sort=price" },
          { label: "Class sets", href: "/books?sort=price" },
        ],
      },
      { title: "Binding", items: BINDINGS },
    ],
    promo: {
      title: "Every title, two ways",
      body: "Most books are listed as both a printed edition and an e-book. Buy either — or both, and save.",
      href: "/books",
      ctaLabel: "See an example",
      emphasis: "primary",
    },
  };

  const ebooks: Department = {
    label: "E-Books",
    href: "/ebooks",
    columns: [
      {
        title: "Formats & delivery",
        items: [
          { label: "EPUB", href: "/ebooks", note: "Apple Books, Kobo" },
          { label: "MOBI", href: "/ebooks", note: "Kindle" },
          { label: "PDF", href: "/ebooks", note: "Print-ready" },
          { label: "Your digital library", href: "/account/library" },
        ],
      },
      {
        title: "Shop by genre",
        items: BOOK_GENRES.slice(0, 4).map((genre) => ({
          label: genre,
          href: `/ebooks?genre=${encodeURIComponent(genre)}`,
        })),
      },
      {
        title: "For institutions",
        items: [
          { label: "Classroom licences", href: "/services", note: "From 30 seats" },
          { label: "Library supply", href: "/services" },
        ],
      },
    ],
  };

  const services: Department = {
    label: "Publishing Services",
    href: "/services",
    columns: [
      {
        title: "E-book creation",
        items: [
          { label: "Basic Conversion", href: "/services/basic-conversion", note: "5-day · ₹7,900" },
          { label: "Standard Formatting", href: "/services/standard-formatting", note: "7-day · ₹17,900" },
          { label: "Premium Design", href: "/services/premium-design", note: "10-day · ₹34,900" },
        ],
      },
      {
        title: "Add-ons",
        items: [
          { label: "Extra revision round", href: "/services" },
          { label: "Audiobook master", href: "/services" },
          { label: "Rush delivery", href: "/services" },
          { label: "ISBN registration", href: "/services" },
        ],
      },
    ],
    promo: {
      title: "Not sure which package?",
      body: "Send us the manuscript and we'll tell you what it actually needs.",
      href: "/services",
      ctaLabel: "Compare packages",
      emphasis: "secondary",
    },
  };

  const selfPublishing: Department = {
    label: "Self-Publishing",
    href: "/self-publishing",
    columns: [
      {
        title: "Packages",
        items: [
          { label: "Starter", href: "/self-publishing", note: "₹9,999" },
          { label: "Guided", href: "/self-publishing", note: "₹24,999" },
          { label: "Full-Service", href: "/self-publishing", note: "₹49,999" },
        ],
      },
      {
        title: "Authors",
        items: [
          { label: "Start a project", href: "/self-publishing/wizard/step-1" },
          { label: "Publishing dashboard", href: "/account/publishing" },
          { label: "Royalties & payouts", href: "/account/publishing" },
        ],
      },
    ],
  };

  // The remaining verticals sit on the bar as plain links — they lead to
  // informational pages, so there's nothing to fan out. Shortened, because
  // nine full category names won't sit on one row.
  const verticals: Department[] = CATALOG_CATEGORY_ORDER.filter(
    (category) => category !== "Author & Publishing Services"
  ).flatMap((category) => {
    const group = catalogGroups.find((candidate) => candidate.category === category);
    if (!group) return [];
    return [{ label: SHORT_LABELS[category] ?? category, href: `/catalog/${group.items[0]!.slug}` }];
  });

  return [allProducts, books, ebooks, services, selfPublishing, ...verticals];
}

/** Footer sitemap — grouped the way the approved design lays it out. */
export const FOOTER_COLUMNS: NavColumn[] = [
  {
    title: "Shop",
    items: [
      { label: "Books", href: "/books" },
      { label: "E-Books", href: "/ebooks" },
      { label: "New releases", href: "/books?sort=new" },
      { label: "Top rated", href: "/books?sort=rating" },
      { label: "Class sets", href: "/books" },
    ],
  },
  {
    title: "For authors",
    items: [
      { label: "Start a project", href: "/self-publishing/wizard/step-1" },
      { label: "Packages & pricing", href: "/self-publishing" },
      { label: "E-book creation", href: "/services" },
      { label: "Royalties", href: "/account/publishing" },
    ],
  },
  {
    title: "Let us help",
    items: [
      { label: "Track an order", href: "/account/orders" },
      { label: "Digital library", href: "/account/library" },
      { label: "Your cart", href: "/cart" },
      { label: "Returns policy", href: "/services" },
    ],
  },
];
