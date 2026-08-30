import type { ProductLine } from "@repo/database";

/**
 * Per-line copy and settings for the three simpler Educational Materials
 * inventory sections — Educational Charts, Worksheets and Activity Puzzles,
 * Teaching and Learning Materials.
 *
 * These share one CMS (list + create/edit form + Server Actions) the same
 * way Books has its own under `../books`, but every one of them is a plain
 * shippable physical product — no formats, no genre, no e-book file — so
 * the shared form is a trimmed-down version of `../books/product-form.tsx`
 * and the only thing that differs between the three is the wording on it.
 * That wording lives here.
 *
 * `productLine`/`slug`/`label` mirror `PRODUCT_LINE_CATALOG` in
 * `@repo/database`'s `taxonomy.ts` — kept in step by hand for now, the same
 * way `components/sidebar-nav.tsx`'s `FIXED_DEPARTMENTS` is (see the root
 * CLAUDE.md's "Product & service taxonomy" note). Import is `type`-only so
 * this file stays usable from Client Components.
 */
export interface ProductLineConfig {
  productLine: ProductLine;
  /** Route segment under `/educational-material/` — also the base of the storefront web address. */
  slug: string;
  /** Plain-English department-menu name. */
  label: string;
  /** How one item is referred to in button and section copy, e.g. "chart". */
  noun: string;
  /** "a" / "an" to sit in front of `noun`. */
  article: "a" | "an";
  copy: {
    /** Sentence under the list page's title. */
    listDescription: string;
    /** Heading + blurb for the create page. */
    newTitle: string;
    newDescription: string;
    /** "About this …" section. */
    aboutTitle: string;
    aboutDescription: string;
    titleLabel: string;
    titlePlaceholder: string;
    /** Maps to `Product.author` — rarely a literal "author" for these lines. */
    makerLabel: string;
    makerHelp: string;
    descriptionHelp: string;
    descriptionPlaceholder?: string;
    coverLabel: string;
    coverHelp: string;
    /** Preview proportions for the image field. */
    coverShape: "cover" | "wide" | "square";
    /** "Printed … details" section. */
    detailsTitle: string;
    detailsDescription: string;
    codeLabel: string;
    codeHelp: string;
    codePlaceholder?: string;
  };
}

const MAKER_HELP_IMPRINT = "Usually your imprint's name — shown on the product page.";
const MAKER_PLACEHOLDER = "New School Book Press";

export const PRODUCT_LINE_CONFIGS: Record<string, ProductLineConfig> = {
  "educational-charts": {
    productLine: "EDUCATIONAL_CHART",
    slug: "educational-charts",
    label: "Educational Charts",
    noun: "chart",
    article: "an",
    copy: {
      listDescription: "Wall and learning charts — the kind hung up at home or in a classroom to help children learn a topic at a glance.",
      newTitle: "Add an educational chart",
      newDescription: "Fill in what you know — you can come back and change any of it later.",
      aboutTitle: "About this chart",
      aboutDescription: "What shoppers read on the chart's own page and in the shop listing.",
      titleLabel: "Chart title",
      titlePlaceholder: "The Solar System — Wall Chart",
      makerLabel: "Publisher or brand",
      makerHelp: MAKER_HELP_IMPRINT,
      descriptionHelp: "What the chart shows and who it's for — an age or class helps.",
      descriptionPlaceholder: "A laminated A2 chart of the planets in order from the Sun, with sizes and key facts. Suits ages 6–11.",
      coverLabel: "Chart image",
      coverHelp: "A photo or scan of the chart. Landscape or portrait both work — whichever matches the chart.",
      coverShape: "wide",
      detailsTitle: "Printed chart details",
      detailsDescription: "Used on the product page and for working out postage.",
      codeLabel: "Product code",
      codeHelp: "Optional. Your own reference or the barcode number on the sleeve.",
    },
  },
  "worksheets-activity-puzzles": {
    productLine: "WORKSHEET_ACTIVITY_PUZZLE",
    slug: "worksheets-activity-puzzles",
    label: "Worksheets and Activity Puzzles",
    noun: "workbook",
    article: "a",
    copy: {
      listDescription: "Worksheet packs, puzzle books and activity sets — word puzzles, Sudoku, brain-development games and the like for younger children.",
      newTitle: "Add a worksheet or puzzle book",
      newDescription: "Fill in what you know — you can come back and change any of it later.",
      aboutTitle: "About this workbook",
      aboutDescription: "What shoppers read on its own page and in the shop listing.",
      titleLabel: "Title",
      titlePlaceholder: "Class 2 Maths Puzzle Pack",
      makerLabel: "Author or creator",
      makerHelp: "Who wrote or designed it. Usually your imprint's name.",
      descriptionHelp: "What the activities cover and the age or class they suit.",
      descriptionPlaceholder: "48 pages of number puzzles, mazes and dot-to-dots that build early problem-solving. Ages 7–9.",
      coverLabel: "Front cover",
      coverHelp: "The image shoppers see in the shop. A photo or scan of the front cover works — portrait shape looks best.",
      coverShape: "cover",
      detailsTitle: "Printed workbook details",
      detailsDescription: "Used on the product page and for working out postage.",
      codeLabel: "ISBN or product code",
      codeHelp: "Optional. The ISBN if it has one, otherwise your own reference.",
      codePlaceholder: "978-81-XXXXX-XX-X",
    },
  },
  "teaching-learning-materials": {
    productLine: "TEACHING_LEARNING_MATERIAL",
    slug: "teaching-learning-materials",
    label: "Teaching and Learning Materials",
    noun: "teaching aid",
    article: "a",
    copy: {
      listDescription: "Classroom aids teachers use to do their job more easily — flash cards, model sets, wall friezes, manipulatives and teacher handbooks.",
      newTitle: "Add a teaching or learning material",
      newDescription: "Fill in what you know — you can come back and change any of it later.",
      aboutTitle: "About this teaching aid",
      aboutDescription: "What teachers read on its own page and in the shop listing.",
      titleLabel: "Name",
      titlePlaceholder: "Wooden Fraction Tiles — Class Set",
      makerLabel: "Publisher or brand",
      makerHelp: MAKER_HELP_IMPRINT,
      descriptionHelp: "What it is, what it's used to teach, and what's in the box.",
      descriptionPlaceholder: "A set of 51 colour-coded wooden tiles for teaching fractions, decimals and percentages. Comes in a wooden tray with a teaching guide.",
      coverLabel: "Product image",
      coverHelp: "A clear photo of the material. Square or landscape works well.",
      coverShape: "square",
      detailsTitle: "Printed material details",
      detailsDescription: "Used on the product page and for working out postage.",
      codeLabel: "Product code",
      codeHelp: "Optional. Your own reference or the barcode number on the box.",
    },
  },
};

export const MAKER_INPUT_PLACEHOLDER = MAKER_PLACEHOLDER;

/** Looks up one line's config by its route segment, or throws — every route folder passes a known slug. */
export function getProductLineConfig(slug: string): ProductLineConfig {
  const config = PRODUCT_LINE_CONFIGS[slug];
  if (!config) throw new Error(`No product-line config for "${slug}"`);
  return config;
}

/** Absolute admin path for one line's list page. */
export function lineBasePath(slug: string): string {
  return `/educational-material/${slug}`;
}
