/**
 * The catalogue of admin-editable storefront copy.
 *
 * Every heading, description, and button label on the storefront that isn't
 * a product, FAQ, testimonial or nav link is listed here once, with:
 *
 *   - the plain-English label and hint apps/admin shows the Publisher, and
 *   - the default copy apps/web renders until someone edits it.
 *
 * The database (`ContentBlock`) only ever stores *overrides*. That means a
 * key can be added here in a release without a migration or a backfill, and
 * a storefront section can never end up blank because nobody filled a field
 * in — the shipped default is always the floor.
 */

export interface ContentEntry {
  key: string;
  /** Field label in the admin form — written for a non-technical reader. */
  label: string;
  /** One-line hint under the label explaining where this text appears. */
  help?: string;
  defaultValue: string;
  /** Render as a textarea rather than a single-line input. */
  multiline?: boolean;
}

export interface ContentGroup {
  id: string;
  /** Section heading in the admin form, named after what's on the page. */
  title: string;
  description: string;
  entries: readonly ContentEntry[];
}

export const CONTENT_GROUPS = [
  {
    id: "categories",
    title: "Category circles",
    description: "The row of round category links just under the hero.",
    entries: [
      {
        key: "homepage.categories.title",
        label: "Heading",
        help: "Sits above the circles.",
        defaultValue: "Explore all categories",
      },
    ],
  },
  {
    id: "popular",
    title: "Popular titles",
    description: "The horizontal shelf of best-selling books.",
    entries: [
      {
        key: "homepage.popular.title",
        label: "Heading",
        defaultValue: "Our most popular titles",
      },
      {
        key: "homepage.popular.standfirst",
        label: "Description",
        help: "One line under the heading.",
        defaultValue: "What readers are ordering most this week.",
      },
    ],
  },
  {
    id: "trust",
    title: "Promises band",
    description: "The three short promises on the tinted strip below the popular titles.",
    entries: [
      {
        key: "homepage.trust.item1.title",
        label: "Promise 1 — heading",
        defaultValue: "Print & e-book, every title",
      },
      {
        key: "homepage.trust.item1.body",
        label: "Promise 1 — description",
        defaultValue: "Buy the physical edition, the e-book, or both — most titles ship either way.",
        multiline: true,
      },
      {
        key: "homepage.trust.item2.title",
        label: "Promise 2 — heading",
        defaultValue: "Easy returns",
      },
      {
        key: "homepage.trust.item2.body",
        label: "Promise 2 — description",
        defaultValue: "Free replacement or full refund on any printed order within seven days.",
        multiline: true,
      },
      {
        key: "homepage.trust.item3.title",
        label: "Promise 3 — heading",
        defaultValue: "Royalties, paid monthly",
      },
      {
        key: "homepage.trust.item3.body",
        label: "Promise 3 — description",
        defaultValue: "Self-published authors see payouts land in their dashboard like clockwork.",
        multiline: true,
      },
    ],
  },
  {
    id: "classSet",
    title: "Class sets band",
    description:
      "The bulk-order panel for schools. The prices in its table come from Pricing → Class set tiers, not from here.",
    entries: [
      {
        key: "homepage.classSet.eyebrow",
        label: "Small label above the heading",
        defaultValue: "Class sets",
      },
      {
        key: "homepage.classSet.title",
        label: "Heading",
        defaultValue: "Buy more, save more.",
      },
      {
        key: "homepage.classSet.body",
        label: "Description",
        defaultValue:
          "Schools and reading groups order the same title in quantity. Pick a tier — the per-copy price drops automatically. No quote, no waiting on a rep.",
        multiline: true,
      },
      {
        key: "homepage.classSet.ctaLabel",
        label: "Button text",
        defaultValue: "Shop class sets",
      },
      {
        key: "homepage.classSet.ctaHref",
        label: "Button link",
        help: "A path on your own site, e.g. /books",
        defaultValue: "/books",
      },
      {
        key: "homepage.classSet.priceCaption",
        label: "Caption above the price table",
        defaultValue: "Books for Primary Students · per copy",
      },
      {
        key: "homepage.classSet.footnote",
        label: "Small print under the price table",
        defaultValue: "MRP (inclusive of all taxes). Delivery billed at checkout.",
        multiline: true,
      },
    ],
  },
  {
    id: "services",
    title: "Author services band",
    description:
      "The dark band showing your self-publishing packages. The package names and prices come from the catalogue (product type “Service package”).",
    entries: [
      {
        key: "homepage.services.eyebrow",
        label: "Small label above the heading",
        defaultValue: "Author services",
      },
      {
        key: "homepage.services.title",
        label: "Heading",
        defaultValue: "Publish it yourself — we'll guide you.",
      },
      {
        key: "homepage.services.standfirst",
        label: "Description",
        defaultValue:
          "Every package takes your manuscript to a finished e-book. Add a printed edition, ISBN registration, and a storefront listing whenever you're ready.",
        multiline: true,
      },
      {
        key: "homepage.services.featuredTag",
        label: "Badge on the highlighted package",
        help: "Shown on the middle package. Clear this to hide the badge.",
        defaultValue: "Most popular",
      },
    ],
  },
  {
    id: "testimonials",
    title: "Testimonials",
    description: "Heading above the quote cards. Edit the quotes themselves under Testimonials.",
    entries: [
      {
        key: "homepage.testimonials.title",
        label: "Heading",
        defaultValue: "From our readers & authors",
      },
    ],
  },
  {
    id: "newsletter",
    title: "Newsletter sign-up",
    description: "The blue band near the bottom of the homepage.",
    entries: [
      {
        key: "homepage.newsletter.title",
        label: "Heading",
        defaultValue: "New titles, once a month.",
      },
      {
        key: "homepage.newsletter.body",
        label: "Description",
        defaultValue:
          "What we printed, what authors published with us, and the occasional first chapter. No more than one email a month.",
        multiline: true,
      },
      {
        key: "homepage.newsletter.placeholder",
        label: "Grey text inside the email box",
        defaultValue: "you@example.com",
      },
      {
        key: "homepage.newsletter.buttonLabel",
        label: "Button text",
        defaultValue: "Subscribe",
      },
    ],
  },
  {
    id: "faq",
    title: "Questions section",
    description: "Heading above the questions. Add and edit the questions themselves under FAQs.",
    entries: [
      {
        key: "homepage.faq.title",
        label: "Heading",
        defaultValue: "Common questions",
      },
    ],
  },
] as const satisfies readonly ContentGroup[];

/** Every key in the registry, as a union — so a typo in apps/web won't compile. */
export type ContentKey = (typeof CONTENT_GROUPS)[number]["entries"][number]["key"];

export type ContentMap = Record<ContentKey, string>;

/**
 * The same groups, widened to the interface.
 *
 * `CONTENT_GROUPS` is `as const` so `ContentKey` can be a union of literals,
 * but that also makes every entry its own object type — code that just wants
 * to loop and read `entry.help` would hit "property does not exist on this
 * member of the union". UI code iterates this instead.
 */
export const CONTENT_GROUP_LIST: readonly ContentGroup[] = CONTENT_GROUPS;

export const CONTENT_ENTRIES: readonly ContentEntry[] = CONTENT_GROUP_LIST.flatMap((group) => [...group.entries]);

export const CONTENT_DEFAULTS = Object.freeze(
  Object.fromEntries(CONTENT_ENTRIES.map((entry) => [entry.key, entry.defaultValue]))
) as ContentMap;

/** True for any key this build still knows about — guards against stale rows. */
export function isContentKey(key: string): key is ContentKey {
  return key in CONTENT_DEFAULTS;
}

/**
 * Merge stored overrides onto the shipped defaults. A blank override is
 * treated as "not set" rather than "show nothing", because clearing a field
 * in the admin form should restore the default rather than break the layout
 * — except where the entry's own default is blank to begin with.
 */
export function mergeContent(rows: readonly { key: string; value: string }[]): ContentMap {
  const merged = { ...CONTENT_DEFAULTS };
  for (const row of rows) {
    if (!isContentKey(row.key)) continue; // key retired in a later release
    const value = row.value.trim();
    if (value) merged[row.key] = value;
  }
  return merged;
}
