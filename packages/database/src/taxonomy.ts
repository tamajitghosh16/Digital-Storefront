/**
 * The five-department, eight-product-line taxonomy the Press sells across
 * (plus its two Publishing services, which aren't `Product` rows — see
 * `ServiceRequest`/`SelfPublishingProject` instead). This is meant to become
 * the single place both apps/admin's `FIXED_DEPARTMENTS`
 * (`components/sidebar-nav.tsx`) and apps/web's `buildDepartments()`
 * (`lib/navigation.ts`) read their labels from, instead of each hardcoding
 * its own copy of this list by hand. See root CLAUDE.md's "Product &
 * service taxonomy" section for the business context and history.
 *
 * `productLine` uses the `ProductLine` Prisma enum only as a *type*
 * (`import type`), never a runtime import — same reasoning as
 * content.ts/pricing.ts: this file has to be importable from Client
 * Components without pulling Prisma into the browser bundle, and a
 * type-only import compiles away entirely.
 */
import type { ProductLine } from "@prisma/client";

export type Department = "Educational Materials" | "Professional Materials" | "Digital & Tech Solutions" | "Lifestyle";

export interface ProductLineEntry {
  productLine: ProductLine;
  /** Plain-English name shown in nav labels and admin forms. */
  label: string;
  department: Department;
  /** Path segment both apps build their own routes from (e.g. "/books", ".../educational-material/books"). */
  slug: string;
  /** True once a real admin CMS page reads/writes `Product` rows for this line — only Books today. */
  hasAdminCms: boolean;
}

/** Flat list of all 8 lines; order matches the storefront's department bar and the admin Inventory sidebar. */
export const PRODUCT_LINE_CATALOG: ProductLineEntry[] = [
  { productLine: "BOOK", label: "Books", department: "Educational Materials", slug: "books", hasAdminCms: true },
  {
    productLine: "EDUCATIONAL_CHART",
    label: "Educational Charts",
    department: "Educational Materials",
    slug: "educational-charts",
    hasAdminCms: false,
  },
  {
    productLine: "WORKSHEET_ACTIVITY_PUZZLE",
    label: "Worksheets and Activity Puzzles",
    department: "Educational Materials",
    slug: "worksheets-activity-puzzles",
    hasAdminCms: false,
  },
  {
    productLine: "TEACHING_LEARNING_MATERIAL",
    label: "Teaching and Learning Materials",
    department: "Educational Materials",
    slug: "teaching-learning-materials",
    hasAdminCms: false,
  },
  {
    productLine: "ADVOCATE_DIARY",
    label: "Advocate's Diary (Naya Bandhu)",
    department: "Professional Materials",
    slug: "advocate-diary",
    hasAdminCms: false,
  },
  {
    productLine: "NAYA_BANDHU_APP",
    label: "Naya Bandhu (Application)",
    department: "Digital & Tech Solutions",
    slug: "naya-bandhu",
    hasAdminCms: false,
  },
  {
    productLine: "DIGITAL_TRACKING_SYSTEM",
    label: "Digital Tracking System",
    department: "Digital & Tech Solutions",
    slug: "digital-tracking-system",
    hasAdminCms: false,
  },
  {
    productLine: "INDOOR_PLANT",
    label: "Indoor Plants (Chatterjee's Green Veranda)",
    department: "Lifestyle",
    slug: "indoor-plants",
    hasAdminCms: false,
  },
];

export interface PublishingServiceEntry {
  label: string;
  slug: string;
}

/**
 * The 2 publishing services — not `Product` rows, so they're kept out of
 * `PRODUCT_LINE_CATALOG`/`ProductLine`. Shown under the "Services" department
 * in both apps' menus (`buildDepartments()` / `FIXED_DEPARTMENTS`).
 */
export const PUBLISHING_SERVICES: PublishingServiceEntry[] = [
  { label: "Self Publishing", slug: "self-publishing" },
  { label: "Bulk Publishing", slug: "bulk-publishing" },
];

/** All product lines belonging to one department, in catalog order. */
export function productLinesByDepartment(department: Department): ProductLineEntry[] {
  return PRODUCT_LINE_CATALOG.filter((entry) => entry.department === department);
}
