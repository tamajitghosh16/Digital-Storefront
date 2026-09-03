import { prisma } from "@repo/database";
import { withFallback } from "./safe-fetch";
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
export async function buildDepartments(): Promise<Department[]> {
  const educationalMaterials: Department = {
    label: "Educational Materials",
    href: "/educational-material/books",
    columns: [
      {
        title: "Educational Materials",
        items: [
          { label: "Books", href: "/educational-material/books" },
          { label: "Educational Charts", href: "/educational-material/educational-charts" },
          { label: "Worksheets and Activity Puzzles", href: "/educational-material/worksheets-activity-puzzles" },
          { label: "Teaching and Learning Materials", href: "/educational-material/teaching-learning-materials" },
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

  const services: Department = {
    label: "Services",
    href: "/self-publishing",
    columns: [
      {
        title: "Services",
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
    href: "/educational-material/books",
    columns: groupCatalogItemsByCategory().map((group) => ({
      title: group.category,
      items: group.items.map((item) => ({
        label: item.title,
        href: `/catalog/${item.slug}`,
        note: item.subBrand,
      })),
    })),
  };

  // Admin-created categories (apps/admin's "Products Menu") — each becomes
  // its own department with a single dropdown column of the products
  // created under it. Inserted ahead of "All Products", which stays last.
  const menuCategories = await withFallback(
    () =>
      prisma.menuCategory.findMany({
        where: { isActive: true },
        orderBy: { order: "asc" },
        include: { products: { where: { isActive: true }, orderBy: { order: "asc" } } },
      }),
    []
  );

  const adminDepartments: Department[] = menuCategories.map((category) => ({
    label: category.name,
    href: `/${category.slug}`,
    columns: [
      {
        title: category.name,
        items: category.products.map((product) => ({ label: product.name, href: `/${product.slug}` })),
      },
    ],
  }));

  // An operator can hide a built-in department from apps/admin's Menu →
  // Categories screen; each hidden one has a `DepartmentVisibility` row.
  // Keys must match `FIXED_DEPARTMENTS` in apps/admin/app/menu/fixed-departments.ts.
  const hiddenKeys = new Set(
    (await withFallback(() => prisma.departmentVisibility.findMany({ where: { hidden: true } }), [])).map(
      (row) => row.key
    )
  );

  const fixedDepartments: { key: string; department: Department }[] = [
    { key: "educational-materials", department: educationalMaterials },
    { key: "professional-materials", department: professionalMaterials },
    { key: "digital-tech-solutions", department: digitalAndTech },
    { key: "services", department: services },
    { key: "lifestyle", department: lifestyle },
  ];

  return [
    ...fixedDepartments.filter(({ key }) => !hiddenKeys.has(key)).map(({ department }) => department),
    ...adminDepartments,
    allProducts,
  ];
}

/** Footer sitemap — grouped the way the approved design lays it out. */
export const FOOTER_COLUMNS: NavColumn[] = [
  {
    title: "Shop",
    items: [
      { label: "Books", href: "/educational-material/books" },
      { label: "New releases", href: "/educational-material/books?sort=new" },
      { label: "Top rated", href: "/educational-material/books?sort=rating" },
      { label: "Class sets", href: "/educational-material/books?classset=1" },
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
