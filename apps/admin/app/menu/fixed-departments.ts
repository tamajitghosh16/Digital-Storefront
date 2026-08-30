/**
 * The storefront's five fixed business-line departments, mirrored for the
 * admin.
 *
 * apps/web's `buildDepartments()` (apps/web/lib/navigation.ts) builds the
 * storefront's top menu from two merged sources: these five fixed
 * departments (real pages, already built) and the admin-managed
 * `MenuCategory` / `MenuProduct` rows. apps/admin and apps/web never import
 * from each other (see root CLAUDE.md), so this list is a hand-kept copy of
 * the fixed half — keep the two in sync if either changes.
 *
 * Consumed by `components/sidebar-nav.tsx` (the Inventory group) and by
 * `app/menu/{categories,products}/page.tsx`, which list every category and
 * product on the storefront menu — these built-in ones plus the live rows.
 *
 * Pure data, no Prisma or server imports, so a Client Component can pull it
 * in directly.
 */

export interface FixedDepartmentProduct {
  label: string;
  /** Where a shopper lands on the storefront — mirrors apps/web's `buildDepartments()`. */
  href: string;
  /** In-app admin page for this line, when one exists. `sidebar-nav.tsx` links here instead of out to the storefront. */
  adminHref?: string;
}

export interface FixedDepartment {
  label: string;
  /** Storefront path the department name links to (its first product line). */
  href: string;
  products: FixedDepartmentProduct[];
}

export const FIXED_DEPARTMENTS: FixedDepartment[] = [
  {
    label: "Educational Materials",
    href: "/educational-material/books",
    products: [
      {
        label: "Books",
        href: "/educational-material/books",
        adminHref: "/educational-material/books",
      },
      {
        label: "Educational Charts",
        href: "/educational-material/educational-charts",
        adminHref: "/educational-material/educational-charts",
      },
      {
        label: "Worksheets and Activity Puzzles",
        href: "/educational-material/worksheets-activity-puzzles",
        adminHref: "/educational-material/worksheets-activity-puzzles",
      },
      {
        label: "Teaching and Learning Materials",
        href: "/educational-material/teaching-learning-materials",
        adminHref: "/educational-material/teaching-learning-materials",
      },
    ],
  },
  {
    label: "Professional Materials",
    href: "/advocate-diary",
    products: [
      {
        label: "Advocate's Diary (Naya Bandhu)",
        href: "/advocate-diary",
        adminHref: "/professional-materials/advocate-diary",
      },
    ],
  },
  {
    label: "Digital & Tech Solutions",
    href: "/naya-bandhu",
    products: [
      { label: "Naya Bandhu (Application)", href: "/naya-bandhu" },
      { label: "Digital Tracking System", href: "/digital-tracking-system" },
    ],
  },
  {
    label: "Services",
    href: "/self-publishing",
    products: [
      { label: "Self Publishing", href: "/self-publishing", adminHref: "/publishing/self-publishing" },
      { label: "Bulk Publishing", href: "/bulk-publishing", adminHref: "/publishing/bulk-publishing" },
    ],
  },
  {
    label: "Lifestyle",
    href: "/indoor-plants",
    products: [
      { label: "Indoor Plants (Chatterjee's Green Veranda)", href: "/indoor-plants", adminHref: "/lifestyle" },
    ],
  },
];
