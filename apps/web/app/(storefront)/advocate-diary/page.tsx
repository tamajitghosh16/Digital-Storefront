import type { Metadata } from "next";
import Link from "next/link";
import {
  Breadcrumb,
  Callout,
  CheckList,
  PageHeader,
  SectionHead,
  Standfirst,
  Stars,
  TABLE_CLASS,
  TD_CLASS,
  TH_CLASS,
  ROW_TH_CLASS,
  TableWrap,
  Wrap,
  buttonClass,
} from "@/components/primitives";
import { FaqList } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Advocate's Diary (Naya Bandhu)",
  description:
    "The Naya Bandhu Advocate's Diary — an annual day-planner and ready-reckoner for practising advocates, printed by Shashibhushan's New School Book Press. 25% of every sale is pledged to the trust.",
};

// Professional Materials · one physical product line, sold in three
// bindings. Static content — this line isn't backed by the Prisma
// `Product` model yet (see root CLAUDE.md's taxonomy note), so the
// editions, spec table and copy live in the page the same way the
// self-publishing landing page carries its packages.

const EDITIONS = [
  {
    name: "Pocket",
    price: "₹385",
    meta: "A6 · 384 pp · flexible cover",
    points: [
      "One day to a page, Monday-start weeks",
      "Slim enough for a court bag",
      "Limitation and court-fee tables at the back",
    ],
  },
  {
    name: "Desk",
    price: "₹545",
    meta: "A5 · 512 pp · sewn hardbound",
    featured: true,
    points: [
      "Day-per-page cause list planner",
      "Ribbon marker and expandable rear pocket",
      "Full ready-reckoner section",
      "Client and case index pages",
    ],
  },
  {
    name: "Chamber",
    price: "₹899",
    meta: "A4 · 640 pp · leatherette, gilt edges",
    points: [
      "Everything in the Desk edition",
      "Two-colour printing, lay-flat binding",
      "Foil-blocked spine, presentation box",
      "Personalised name blocking on 25+ orders",
    ],
  },
];

const INSIDE = [
  "Day-per-page cause list planner with unheard-matter carry-forward",
  "Limitation-period ready reckoner — Limitation Act 1963, CPC and CrPC",
  "Court-fee and stamp-duty tables for West Bengal",
  "High Court and district court vacation calendar for the diary year",
  "Interest and mesne-profits calculators with worked examples",
  "Cause-title, verification and vakalatnama format pages",
  "Client ledger, fee register and undated appointment pages",
  "STD codes, holidays and a rule-against-perpetuities aide-mémoire",
];

const SPEC_ROWS: { label: string; values: [string, string, string] }[] = [
  { label: "Trim size", values: ["A6 (105 × 148 mm)", "A5 (148 × 210 mm)", "A4 (210 × 297 mm)"] },
  { label: "Extent", values: ["384 pages", "512 pages", "640 pages"] },
  { label: "Binding", values: ["Flexible board", "Sewn case, cloth spine", "Leatherette, gilt edges"] },
  { label: "Paper", values: ["70 gsm cream", "80 gsm cream", "90 gsm cream, acid-free"] },
  { label: "Ribbon marker", values: ["—", "1", "2"] },
  { label: "Diary year", values: ["Jan–Dec 2026", "Jan–Dec 2026", "Jan–Dec 2026"] },
  { label: "Languages", values: ["English", "English", "English + Bengali index"] },
];

const REVIEWS = [
  {
    name: "Adv. S. Bhattacharya",
    place: "Calcutta High Court",
    rating: 5,
    body: "The carry-forward column for part-heard matters is the one thing every other diary gets wrong. This one gets it right.",
  },
  {
    name: "Adv. R. Iyer",
    place: "City Civil Court, Bengaluru",
    rating: 4,
    body: "Bought the Chamber edition for my senior and the Desk for myself. The limitation tables have already saved me twice.",
  },
];

const FAQS = [
  {
    id: "shipping",
    question: "How is it shipped, and when?",
    answer:
      "Editions dispatch within two working days by tracked courier across India, with the current diary year printed from November. Delivery is free above ₹499; a flat ₹49 applies below that.",
  },
  {
    id: "trust",
    question: "What does the 25% trust pledge mean?",
    answer:
      "A quarter of the sale value of every Advocate's Diary is transferred to the Sashibhusan Book Press Memorial Trust, which funds legal-aid clinics and first-generation-lawyer scholarships. The contribution is shown as a line on your invoice.",
  },
  {
    id: "gst",
    question: "Can I get a GST invoice for chamber accounts?",
    answer:
      "Yes. Add your GSTIN and billing name at checkout and a tax invoice is issued automatically. Printed books are nil-rated, so no GST is charged on the diary itself.",
  },
  {
    id: "bulk",
    question: "We're a bar association ordering in quantity — is there a rate?",
    answer:
      "Orders of 25 copies or more of a single edition qualify for association pricing and optional name blocking. Start a bulk request and we'll come back with a quote and a print slot.",
  },
];

export default function AdvocateDiaryPage() {
  return (
    <>
      <Wrap>
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Professional Materials" },
            { label: "Advocate's Diary (Naya Bandhu)" },
          ]}
        />
      </Wrap>

      <PageHeader>
        <Callout tone="tile">Professional Materials</Callout>
        <h1 className="mt-4">The diary that already knows the court calendar.</h1>
        <Standfirst>
          The Naya Bandhu Advocate&rsquo;s Diary is a year planner and a ready reckoner in one book &mdash; cause
          lists, limitation tables, court fees and vacation dates, laid out the way practice actually runs.
        </Standfirst>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="#editions" className={buttonClass("primary", "lg")}>
            See the three editions
          </Link>
          <Link href="/bulk-publishing" className={buttonClass("secondary", "lg")}>
            Order for a bar association
          </Link>
        </div>
      </PageHeader>

      <Wrap as="section" id="editions" className="scroll-mt-6 py-12">
        <SectionHead title="Three editions" standfirst="Same content section; different size, paper and binding." />
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {EDITIONS.map((edition) => (
            <div
              key={edition.name}
              className={
                edition.featured
                  ? "rounded-tile bg-ground p-6 inset-ring-[3px] inset-ring-ink"
                  : "rounded-tile bg-ground p-6 inset-ring inset-ring-line"
              }
            >
              <Callout tone={edition.featured ? "brand" : "tile"}>
                {edition.featured ? `${edition.name} · most ordered` : edition.name}
              </Callout>
              <p className="mt-3.5 text-[34px] font-bold tracking-[-0.03em] tabular-nums">{edition.price}</p>
              <p className="text-sm text-ink-muted">{edition.meta}</p>
              <CheckList className="mt-[18px]" items={edition.points} />
            </div>
          ))}
        </div>
        <p className="mt-3.5 text-sm text-ink-muted">
          Prices include the trust contribution. Storefront checkout for this line opens with the 2026 print run.
        </p>
      </Wrap>

      <Wrap as="section" className="pb-12">
        <SectionHead title="What's in the ready-reckoner section" />
        <CheckList
          className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2"
          items={INSIDE}
        />
      </Wrap>

      <Wrap as="section" className="pb-12">
        <SectionHead title="Specifications" />
        <TableWrap>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH_CLASS} />
                {EDITIONS.map((edition) => (
                  <th key={edition.name} className={TH_CLASS}>
                    {edition.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SPEC_ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className={ROW_TH_CLASS}>
                    {row.label}
                  </th>
                  {row.values.map((value, i) => (
                    <td key={i} className={TD_CLASS}>
                      {value}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Wrap>

      <Wrap as="section" className="pb-12">
        <div className="flex flex-wrap items-center gap-4 rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
          <span aria-hidden className="text-[26px] leading-none">
            ₹
          </span>
          <div className="min-w-[240px] flex-1">
            <h3>25% of every sale supports the trust</h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              The Sashibhusan Book Press Memorial Trust runs legal-aid clinics and scholarships for first-generation
              lawyers. Your invoice shows the contribution as its own line.
            </p>
          </div>
        </div>
      </Wrap>

      <Wrap as="section" className="pb-12">
        <SectionHead title="From advocates who keep one on the desk" />
        <div className="grid gap-4 sm:grid-cols-2">
          {REVIEWS.map((review) => (
            <figure
              key={review.name}
              className="rounded-tile bg-ground p-6 inset-ring inset-ring-line"
            >
              <Stars rating={review.rating} />
              <blockquote className="mt-3 text-[15px] leading-[1.6]">&ldquo;{review.body}&rdquo;</blockquote>
              <figcaption className="mt-3 text-sm text-ink-muted">
                {review.name} &middot; {review.place}
              </figcaption>
            </figure>
          ))}
        </div>
      </Wrap>

      <Wrap as="section" id="questions" className="scroll-mt-6 pb-14">
        <SectionHead title="Questions advocates ask first" />
        <FaqList items={FAQS} />
      </Wrap>
    </>
  );
}
