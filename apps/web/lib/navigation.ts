import { groupCatalogItemsByCategory } from "./catalog";

/**
 * The department bar and its hover panels.
 *
 * Five business-line departments, each with a single-column panel that
 * opens on hover, plus an "All Products" catch-all pinned to the far
 * right. The model is plain serialisable data so the bar can stay a
 * Server Component — the panels are CSS-driven, not stateful.
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

// Five business-line departments, each a single-column dropdown of the
// catalog items that belong to it. Replaces the earlier nine-item bar
// (All Products / Books / E-Books / Publishing Services / Self-Publishing
// / the four PRD verticals) with the operator's own five-way grouping.
export function buildDepartments(): Department[] {
  const educationalMaterials: Department = {
    label: "Educational Materials",
    href: "/books",
    columns: [
      {
        title: "Educational Materials",
        items: [
          { label: "Books", href: "/books" },
          { label: "Educational Charts", href: "/educational-charts" },
          { label: "Worksheets and Activity Puzzles", href: "/worksheets-activity-puzzles" },
          { label: "Teaching and Learning Materials", href: "/teaching-learning-materials" },
        ],
      },
    ],
  };

  const professionalMaterials: Department = {
    label: "Professional Materials",
    href: "/advocate-diary",
    columns: [
      {
        title: "Professional Materials",
        items: [{ label: "Advocate's Diary (Naya Bandhu)", href: "/advocate-diary" }],
      },
    ],
  };

  const digitalAndTech: Department = {
    label: "Digital & Tech Solutions",
    href: "/naya-bandhu",
    columns: [
      {
        title: "Digital & Tech Solutions",
        items: [
          { label: "Naya Bandhu (Application)", href: "/naya-bandhu" },
          { label: "Digital Tracking System", href: "/digital-tracking-system" },
        ],
      },
    ],
  };

  const publishing: Department = {
    label: "Publishing",
    href: "/self-publishing",
    columns: [
      {
        title: "Publishing",
        items: [
          { label: "Self Publishing", href: "/self-publishing" },
          { label: "Bulk Publishing", href: "/bulk-publishing" },
        ],
      },
    ],
  };

  const lifestyle: Department = {
    label: "Lifestyle",
    href: "/indoor-plants",
    columns: [
      {
        title: "Lifestyle",
        items: [{ label: "Indoor Plants (Chatterjee's Green Veranda)", href: "/indoor-plants" }],
      },
    ],
  };

  const allProducts: Department = {
    label: "All Products",
    href: "/books",
    columns: groupCatalogItemsByCategory().map((group) => ({
      title: group.category,
      items: group.items.map((item) => ({
        label: item.title,
        href: `/catalog/${item.slug}`,
        note: item.subBrand,
      })),
    })),
  };

  return [educationalMaterials, professionalMaterials, digitalAndTech, publishing, lifestyle, allProducts];
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
