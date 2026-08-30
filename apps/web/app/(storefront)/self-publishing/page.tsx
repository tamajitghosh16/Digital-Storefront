import type { Metadata } from "next";
import Link from "next/link";
import {
  Breadcrumb,
  Callout,
  CheckList,
  PageHeader,
  SectionHead,
  Standfirst,
  TABLE_CLASS,
  TD_CLASS,
  TH_CLASS,
  TableWrap,
  Wrap,
  buttonClass,
} from "@/components/primitives";
import { FaqList, PlanBand } from "@/components/marketing";

export const metadata: Metadata = { title: "Self-Publishing" };

// FR-6.1: entry point for the guided self-publishing wizard. The real
// implementation is a multi-step Server Action flow persisting a draft
// SelfPublishingProject per step (Technical Design Document 3.5).

const PACKAGES = [
  {
    name: "Starter",
    price: "₹9,999",
    meta: "Digital only · 3 weeks",
    points: ["E-book production (EPUB, MOBI)", "Template cover", "Listing on this storefront", "70% digital royalty"],
  },
  {
    name: "Guided",
    price: "₹24,999",
    meta: "Digital + short print run · 5 weeks",
    points: [
      "Everything in Starter",
      "Custom interior typesetting",
      "ISBN registration",
      "50 printed copies",
      "Named project manager",
    ],
    featured: true,
  },
  {
    name: "Full-Service",
    price: "₹49,999",
    meta: "Full launch · 8 weeks",
    points: [
      "Everything in Guided",
      "Cover designed from scratch",
      "250 printed copies",
      "Distribution to Indian retailers",
      "Launch page & press kit",
    ],
  },
];

const ROYALTIES = [
  { sold: "E-book, this storefront", list: "₹999", rate: "70%", each: "₹699", paid: "7th monthly" },
  { sold: "Paperback, this storefront", list: "₹2,499", rate: "40%", each: "₹999", paid: "7th monthly" },
  { sold: "Paperback, retail distribution", list: "₹2,499", rate: "22%", each: "₹549", paid: "Quarterly" },
  { sold: "Class set, 30+ copies", list: "₹2,049", rate: "35%", each: "₹717", paid: "7th monthly" },
];

const WIZARD = [
  { tag: "Step 1 · now", title: "Your book", points: ["Title, subtitle, genre", "Blurb and author bio"], featured: true },
  { tag: "Step 2", title: "Manuscript", points: ["Upload the file", "Scanned before we open it"] },
  { tag: "Step 3", title: "Package", points: ["Starter, Guided, or Full-Service", "Add-ons if you need them"] },
  { tag: "Step 4", title: "Review & pay", points: ["Fixed quote, no deposit games", "Production starts on payment"] },
];

const FAQS = [
  {
    id: "rights",
    question: "Do I keep the rights to my book?",
    answer:
      "Entirely. You hold the copyright, the ISBN is registered in your name, and you can take the print-ready files elsewhere at any time. Listing here is non-exclusive.",
  },
  {
    id: "timeline",
    question: "How firm are the timelines?",
    answer:
      "The weeks shown against each package are from the point your manuscript is final and payment has cleared. Revision rounds you request pause the clock; nothing else does.",
  },
  {
    id: "editing",
    question: "Is editing included?",
    answer:
      "Production, typesetting, cover and ISBN are included. Structural and copy editing are separate — add them as an add-on in the wizard, or bring your own editor.",
  },
  {
    id: "payouts",
    question: "When do royalties actually arrive?",
    answer:
      "Storefront sales are totalled monthly and paid by bank transfer on the 7th once your balance passes ₹1,000. Retail-distribution sales settle quarterly. Every statement downloads as CSV from your dashboard.",
  },
];

export default function SelfPublishingLandingPage() {
  return (
    <>
      <Wrap>
        <Breadcrumb
          trail={[{ label: "Home", href: "/" }, { label: "Services" }, { label: "Self-Publishing" }]}
        />
      </Wrap>

      <PageHeader>
        <Callout>Self-publishing programme</Callout>
        <h1 className="mt-4">From manuscript to storefront listing.</h1>
        <Standfirst>
          The full route: production, ISBN, print run, listing, and royalties. Start the wizard and we&rsquo;ll take it
          from wherever your book currently is.
        </Standfirst>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/self-publishing/wizard/step-1" className={buttonClass("primary", "lg")}>
            Start a project
          </Link>
          <Link href="/account/publishing" className={buttonClass("secondary", "lg")}>
            Open my dashboard
          </Link>
        </div>
      </PageHeader>

      <Wrap as="section" className="py-12">
        <SectionHead title="Pick a package" standfirst="All three end with a book people can buy." />
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.name}
              className={
                pkg.featured
                  ? "rounded-tile bg-ground p-6 inset-ring-[3px] inset-ring-ink"
                  : "rounded-tile bg-ground p-6 inset-ring inset-ring-line"
              }
            >
              <Callout tone={pkg.featured ? "brand" : "tile"}>
                {pkg.featured ? `${pkg.name} · most chosen` : pkg.name}
              </Callout>
              <p className="mt-3.5 text-[34px] font-bold tracking-[-0.03em] tabular-nums">{pkg.price}</p>
              <p className="text-sm text-ink-muted">{pkg.meta}</p>
              <CheckList className="mt-[18px]" items={pkg.points} />
              <Link
                href="/self-publishing/wizard/step-1"
                className={buttonClass(pkg.featured ? "primary" : "secondary", "md", "mt-[22px] w-full")}
              >
                Choose {pkg.name}
              </Link>
            </div>
          ))}
        </div>
      </Wrap>

      <Wrap as="section" className="pb-12">
        <SectionHead title="What you earn" standfirst="Royalty rates are the same whichever package you start on." />
        <TableWrap>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH_CLASS}>Sold as</th>
                <th className={TH_CLASS}>List price</th>
                <th className={TH_CLASS}>Your royalty</th>
                <th className={TH_CLASS}>Per copy</th>
                <th className={TH_CLASS}>Paid</th>
              </tr>
            </thead>
            <tbody>
              {ROYALTIES.map((row) => (
                <tr key={row.sold}>
                  <td className={TD_CLASS}>{row.sold}</td>
                  <td className={`${TD_CLASS} tabular-nums`}>{row.list}</td>
                  <td className={`${TD_CLASS} tabular-nums`}>{row.rate}</td>
                  <td className={`${TD_CLASS} tabular-nums`}>{row.each}</td>
                  <td className={TD_CLASS}>{row.paid}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="mt-3.5 text-sm text-ink-muted">
          Payouts are made by bank transfer once the balance passes ₹1,000. Statements are downloadable as CSV from
          your dashboard.
        </p>
      </Wrap>

      <PlanBand
        eyebrow="The wizard"
        title="Four screens, then it's with us."
        standfirst="You can leave and come back — the project saves at every step."
        plans={WIZARD}
      />

      <Wrap as="section" className="py-12">
        <SectionHead title="Before you start" />
        <FaqList items={FAQS} />
      </Wrap>
    </>
  );
}
