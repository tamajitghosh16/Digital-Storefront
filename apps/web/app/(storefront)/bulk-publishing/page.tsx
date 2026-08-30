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
  ROW_TH_CLASS,
  TableWrap,
  Wrap,
  buttonClass,
} from "@/components/primitives";
import { FaqList, PlanBand } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Bulk Publishing",
  description:
    "Volume printing and publishing for schools, coaching centres, libraries and institutions ordering the same title in quantity — offset pricing, ISBN, warehousing and split delivery.",
};

// Services · the institutional counterpart to Self-Publishing. Not a
// Prisma `Product` line — every order is quoted, so the page is a rate
// card plus a quote request. Static content, same pattern as the
// self-publishing landing page.

const AUDIENCE = [
  { title: "Schools & boards", body: "Readers, workbooks and prescribed titles printed to the term's headcount." },
  { title: "Coaching centres", body: "Study material and mock-test booklets, reprinted each batch without re-setup fees." },
  { title: "Libraries & trusts", body: "Reprints of out-of-print regional titles in library-grade binding." },
  { title: "Reading groups & NGOs", body: "Single-title runs for distribution drives, with delivery split across sites." },
];

const RATE_CARD = [
  { band: "30 – 99 copies", paperback: "₹182 / copy", hardback: "₹268 / copy", setup: "₹1,500" },
  { band: "100 – 299 copies", paperback: "₹156 / copy", hardback: "₹234 / copy", setup: "Waived" },
  { band: "300 – 999 copies", paperback: "₹128 / copy", hardback: "₹198 / copy", setup: "Waived" },
  { band: "1,000+ copies", paperback: "From ₹104 / copy", hardback: "From ₹168 / copy", setup: "Waived" },
];

const INCLUDED = [
  "Offset printing on 80 gsm cream paper, 300 gsm laminated cover",
  "One ISBN per title, registered in the institution's name",
  "Print-ready file check and a single hard-copy proof",
  "Free warehousing for up to 90 days after the run",
  "Delivery split across up to 5 addresses at no extra cost",
  "GST tax invoice; printed books are nil-rated",
];

const PROCESS = [
  { tag: "Step 1", title: "Brief", points: ["Send the title, quantity and deadline", "Upload the manuscript or last edition's files"] },
  { tag: "Step 2", title: "Quote & proof", points: ["Fixed quote within two working days", "One bound proof couriered for sign-off"] },
  { tag: "Step 3", title: "Print run", points: ["Production starts on approval and 50% advance", "Progress visible from your dashboard"] },
  { tag: "Step 4", title: "Deliver", points: ["Balance due on dispatch", "Split delivery, tracked, with delivery challans"] },
];

const TURNAROUND = [
  { band: "30 – 99 copies", digital: "5 working days", offset: "—" },
  { band: "100 – 299 copies", digital: "7 working days", offset: "10 working days" },
  { band: "300 – 999 copies", digital: "—", offset: "12 working days" },
  { band: "1,000+ copies", digital: "—", offset: "15 – 20 working days" },
];

const FAQS = [
  {
    id: "min",
    question: "What's the minimum order?",
    answer:
      "Thirty copies of a single title. Below that, the per-copy economics don't beat our standard print-on-demand, so we'll point you there instead.",
  },
  {
    id: "reprint",
    question: "We reprint the same book every term. Is it cheaper the second time?",
    answer:
      "Yes. Once a title's files are set up with us, later runs skip the setup fee and the proof round unless the content changes. Most repeat runs are quoted same-day.",
  },
  {
    id: "isbn",
    question: "Do we need our own ISBN?",
    answer:
      "No. We register one per title on your behalf as part of the run, in the institution's name. If you already hold an ISBN for the title, we'll use it.",
  },
  {
    id: "gst",
    question: "How does GST and invoicing work for a school?",
    answer:
      "Printed books are nil-rated, so no GST is charged on the books themselves. You'll get a compliant tax invoice with your institution's name and GSTIN, plus delivery challans for each address.",
  },
  {
    id: "content",
    question: "Can you also lay out the book, not just print it?",
    answer:
      "Yes — typesetting, cover and cleanup are available as add-ons and folded into the same quote. For a brand-new single-author title, the Self-Publishing programme is usually the better fit.",
  },
];

export default function BulkPublishingPage() {
  return (
    <>
      <Wrap>
        <Breadcrumb
          trail={[{ label: "Home", href: "/" }, { label: "Services" }, { label: "Bulk Publishing" }]}
        />
      </Wrap>

      <PageHeader>
        <Callout>Publishing services</Callout>
        <h1 className="mt-4">One title, printed to the size of your class.</h1>
        <Standfirst>
          Volume publishing and printing for schools, coaching centres, libraries and institutions. Offset pricing that
          drops with quantity, ISBN registration, free short-term warehousing, and delivery split across your sites.
        </Standfirst>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="#quote" className={buttonClass("primary", "lg")}>
            Request a quote
          </Link>
          <Link href="#rate-card" className={buttonClass("secondary", "lg")}>
            See the rate card
          </Link>
        </div>
      </PageHeader>

      <Wrap as="section" className="py-12">
        <SectionHead title="Who orders this way" />
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {AUDIENCE.map((item) => (
            <div key={item.title} className="rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
              <h3>{item.title}</h3>
              <p className="mt-2 text-sm leading-[1.6] text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Wrap>

      <Wrap as="section" id="rate-card" className="scroll-mt-6 pb-12">
        <SectionHead
          title="Rate card"
          standfirst="Indicative per-copy prices for a 200-page B/W title. Your quote is fixed to your spec."
        />
        <TableWrap>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH_CLASS}>Quantity</th>
                <th className={TH_CLASS}>Paperback</th>
                <th className={TH_CLASS}>Hardback</th>
                <th className={TH_CLASS}>Setup</th>
              </tr>
            </thead>
            <tbody>
              {RATE_CARD.map((row) => (
                <tr key={row.band}>
                  <th scope="row" className={ROW_TH_CLASS}>
                    {row.band}
                  </th>
                  <td className={`${TD_CLASS} tabular-nums`}>{row.paperback}</td>
                  <td className={`${TD_CLASS} tabular-nums`}>{row.hardback}</td>
                  <td className={`${TD_CLASS} tabular-nums`}>{row.setup}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <p className="mt-3.5 text-sm text-ink-muted">
          Colour interiors, non-standard sizes and premium stock are quoted on top. Repeat runs of a set-up title skip
          the setup fee.
        </p>
      </Wrap>

      <Wrap as="section" className="pb-12">
        <SectionHead title="Every run includes" />
        <CheckList className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2" items={INCLUDED} />
      </Wrap>

      <PlanBand
        eyebrow="How it runs"
        title="Brief to delivery in four steps."
        standfirst="A 50% advance starts production; the balance is due on dispatch. You can watch the run's status from your dashboard."
        plans={PROCESS.map((step) => ({ tag: step.tag, title: step.title, points: step.points }))}
      />

      <Wrap as="section" className="py-12">
        <SectionHead title="Turnaround" standfirst="From approved proof and cleared advance to dispatch." />
        <TableWrap>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH_CLASS}>Quantity</th>
                <th className={TH_CLASS}>Digital press</th>
                <th className={TH_CLASS}>Offset press</th>
              </tr>
            </thead>
            <tbody>
              {TURNAROUND.map((row) => (
                <tr key={row.band}>
                  <th scope="row" className={ROW_TH_CLASS}>
                    {row.band}
                  </th>
                  <td className={TD_CLASS}>{row.digital}</td>
                  <td className={TD_CLASS}>{row.offset}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Wrap>

      <Wrap as="section" id="quote" className="scroll-mt-6 pb-12">
        <div className="rounded-tile bg-band px-7 py-10 text-band-ink min-[820px]:px-12 min-[820px]:py-12">
          <Callout>Request a quote</Callout>
          <h2 className="mt-3.5 text-[28px]">Tell us the title, the quantity and the deadline.</h2>
          <p className="mt-3 max-w-[54ch] text-[15px] leading-[1.6] text-band-muted">
            We&rsquo;ll reply within two working days with a fixed quote, a proof plan and the next available print
            slot. Institutional purchase orders are welcome.
          </p>
          <form className="mt-5 flex max-w-[520px] flex-wrap gap-2.5">
            <label htmlFor="bulk-email" className="sr-only">
              Work email address
            </label>
            <input
              id="bulk-email"
              type="email"
              required
              placeholder="you@institution.edu.in"
              className="h-[50px] min-w-[210px] flex-1 rounded-full border-2 border-band-plan-edge bg-ground px-5 text-ink focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-btn border-2 border-band-button bg-band-button px-4 py-3 text-base font-bold text-band-button-ink transition hover:brightness-150"
            >
              Request a quote
            </button>
          </form>
          <p className="mt-4 text-[13px] text-band-muted">
            Publishing a brand-new single-author book instead?{" "}
            <Link href="/self-publishing" className="font-bold underline underline-offset-2">
              See the Self-Publishing programme
            </Link>
            .
          </p>
        </div>
      </Wrap>

      <Wrap as="section" className="pb-14">
        <SectionHead title="Questions institutions ask" />
        <FaqList items={FAQS} />
      </Wrap>
    </>
  );
}
