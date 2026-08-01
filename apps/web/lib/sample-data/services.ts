// E-book creation packages and the add-ons that stack onto them.

import { baseProductFields, type DisplayProduct } from "./shared";

interface ServiceSeed {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceCents: number;
  turnaroundDays: number;
  features: string[];
  featured?: boolean;
}

export const SERVICE_SEEDS: ServiceSeed[] = [
  {
    id: "service-basic",
    slug: "basic-conversion",
    title: "Basic Conversion",
    description: "Manuscript to EPUB & MOBI with standard formatting and a template cover.",
    priceCents: 790000,
    turnaroundDays: 5,
    features: ["Manuscript → EPUB & MOBI", "Standard formatting", "Template cover", "3–5 day turnaround"],
  },
  {
    id: "service-standard",
    slug: "standard-formatting",
    title: "Standard Formatting",
    description: "Custom interior formatting with front/back matter and a round of revisions.",
    priceCents: 1790000,
    turnaroundDays: 7,
    features: [
      "Everything in Basic",
      "Custom interior formatting",
      "Table of contents & front/back matter",
      "1 round of revisions",
      "5–7 day turnaround",
    ],
    featured: true,
  },
  {
    id: "service-premium",
    slug: "premium-design",
    title: "Premium Design",
    description: "Custom cover design, illustration placement, and multi-format delivery.",
    priceCents: 3490000,
    turnaroundDays: 10,
    features: [
      "Everything in Standard",
      "Custom cover design",
      "Image & illustration placement",
      "2 rounds of revisions",
      "Multi-format delivery",
    ],
  },
];

export const SAMPLE_SERVICES: DisplayProduct[] = SERVICE_SEEDS.map((s) => ({
  ...baseProductFields(),
  id: s.id,
  type: "SERVICE_PACKAGE",
  title: s.title,
  author: "New School Book Press",
  slug: s.slug,
  description: s.features.join("\n"),
  priceCents: s.priceCents,
  coverImageUrl: null,
  stockQty: null,
  isbn: null,
  formats: [],
  sampleUrl: null,
  turnaroundDays: s.turnaroundDays,
  pages: null,
  genre: "Digital Service",
  rating: 4.9,
  reviewCount: 12,
  coverFrom: "#c9973b",
  coverTo: "#8a641f",
})) as DisplayProduct[];

export const SERVICE_ADDONS = [
  { name: "Proofreading", priceCents: 4500 },
  { name: "Copy Editing", priceCents: 12000 },
  { name: "ISBN Registration Assistance", priceCents: 2500 },
  { name: "Metadata & Keyword Optimization", priceCents: 3500 },
];
