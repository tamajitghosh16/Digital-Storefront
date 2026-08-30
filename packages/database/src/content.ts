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
    id: "popular",
    title: "Popular titles",
    description: "The horizontal shelf of best-selling books.",
    entries: [
      {
        key: "homepage.popular.title",
        label: "Heading",
        defaultValue: "Our most popular books",
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
    description: "The three short promises shown on catalog item pages (no longer shown on the homepage).",
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
    id: "educationalLearning",
    title: "Educational and Learning band",
    description: "Short highlight for the educational-materials product lines.",
    entries: [
      {
        key: "homepage.educationalLearning.title",
        label: "Heading",
        defaultValue: "Educational and Learning",
      },
      {
        key: "homepage.educationalLearning.body",
        label: "Description",
        defaultValue:
          "Charts, worksheets, activity puzzles and teaching materials published under our Ink & Imagination imprint — classroom-ready resources for primary students and educators alike.",
        multiline: true,
      },
    ],
  },
  {
    id: "professionalProducts",
    title: "Professional products band",
    description: "Short highlight for the Advocate's Diary (Naya Bandhu).",
    entries: [
      {
        key: "homepage.professionalProducts.title",
        label: "Heading",
        defaultValue: "Professional products",
      },
      {
        key: "homepage.professionalProducts.body",
        label: "Description",
        defaultValue:
          "The Advocate's Diary (Naya Bandhu) is legal stationery built for the job — a daily planner sized for case lists, hearing dates and client notes.",
        multiline: true,
      },
    ],
  },
  {
    id: "digitalTechSolutions",
    title: "Digital & Tech Solutions band",
    description: "Short highlight for the Naya Bandhu app and Digital Tracking System.",
    entries: [
      {
        key: "homepage.digitalTechSolutions.title",
        label: "Heading",
        defaultValue: "Digital & Tech Solutions",
      },
      {
        key: "homepage.digitalTechSolutions.body",
        label: "Description",
        defaultValue:
          "Naya Bandhu puts legal productivity tools in an advocate's pocket, and our Digital Tracking System gives institutions a direct software entitlement for enterprise-grade tracking.",
        multiline: true,
      },
    ],
  },
  {
    id: "publishing",
    title: "Services band",
    description: "Short highlight for self-publishing and bulk publishing.",
    entries: [
      {
        key: "homepage.publishing.title",
        label: "Heading",
        defaultValue: "Services",
      },
      {
        key: "homepage.publishing.body",
        label: "Description",
        defaultValue:
          "Publish a single title through our guided self-publishing program, or place a bulk print run for schools, reading groups and institutions ordering in quantity.",
        multiline: true,
      },
    ],
  },
  {
    id: "lifestyle",
    title: "Lifestyle band",
    description: "Short highlight for the indoor plants line.",
    entries: [
      {
        key: "homepage.lifestyle.title",
        label: "Heading",
        defaultValue: "Lifestyle",
      },
      {
        key: "homepage.lifestyle.body",
        label: "Description",
        defaultValue:
          "Chatterjee's Green Veranda brings indoor plants to your doorstep, fostering environmental conservation and a connection with nature at home.",
        multiline: true,
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
        defaultValue: "Subscribe to get latest updates",
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
