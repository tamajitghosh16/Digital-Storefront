import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_SERVICES, SERVICE_ADDONS } from "@/lib/sample-data";
import { formatINRWhole } from "@/lib/format";
import {
  Callout,
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

export const metadata: Metadata = { title: "Publishing Services" };

// FR-2.3: service-package catalogue. The comparison table is the centre
// of this page — three fixed prices, and what separates them.

const PROCESS = [
  { tag: "Step 1", title: "Upload", points: ["DOCX, ODT, or PDF", "We confirm the word count", "Quote fixed within a day"] },
  { tag: "Step 2", title: "Set", points: ["Interior typeset to package", "Cover drafted or selected", "First proof in your dashboard"] },
  { tag: "Step 3", title: "Revise", points: ["You mark up the proof", "We apply your included round", "Extra rounds ₹2,500 each"] },
  { tag: "Step 4", title: "Deliver", points: ["Final files to your library", "Optional ISBN registration", "Optional storefront listing"] },
];

const ADDON_DETAIL: Record<string, { turnaround: string; covers: string }> = {
  "Extra revision round": { turnaround: "+2 days", covers: "One more markup-and-apply cycle on the proof" },
  Proofreading: { turnaround: "+2 days", covers: "A read for typos, spacing and broken references" },
  "Copy Editing": { turnaround: "+5 days", covers: "Line-level editing for sense, grammar and consistency" },
  "ISBN Registration Assistance": {
    turnaround: "+3 days",
    covers: "Filed with the Raja Rammohun Roy National Agency on your behalf",
  },
  "Metadata & Keyword Optimization": { turnaround: "+1 day", covers: "Categories and search terms set for the retailers" },
};

const FAQS = [
  {
    id: "edit",
    question: "Do you edit the writing itself?",
    answer:
      "No. We set and produce — typesetting, formatting, cover, files. If the manuscript needs a copy-editor we'll say so and point you at one, but we won't quietly rewrite your sentences.",
  },
  {
    id: "rights",
    question: "Who owns the finished files?",
    answer:
      "You do, completely. We keep no rights to the text, the cover, or the production files, and you can take them anywhere.",
  },
  {
    id: "mess",
    question: "What if the manuscript is a mess?",
    answer:
      "Most are. Track changes, mixed fonts, images pasted inline — all normal. We'll flag anything that genuinely blocks production before we start.",
  },
  {
    id: "sell",
    question: "Can I sell it here afterwards?",
    answer:
      "Yes, and listing is free. You keep 70% of the digital list price and 40% of the printed price, paid on the 7th of each month.",
  },
];

interface ServiceLike {
  id: string;
  slug: string;
  title: string;
  priceCents: number;
  description: string | null;
  turnaroundDays: number | null;
}

export default async function ServicesCataloguePage() {
  const services = (await withFallback(
    () => prisma.product.findMany({ where: { type: "SERVICE_PACKAGE", isPublished: true }, orderBy: { priceCents: "asc" } }),
    SAMPLE_SERVICES
  )) as ServiceLike[];

  const featureRows = [
    { label: "Turnaround", values: services.map((s) => (s.turnaroundDays != null ? `${s.turnaroundDays} days` : "—")) },
    { label: "EPUB & MOBI", values: services.map(() => "✓") },
    { label: "Interior formatting", values: ["Standard", "Custom", "Custom + illustrations"] },
    { label: "Cover", values: ["Template", "Template", "Designed from scratch"] },
    { label: "Front & back matter", values: ["—", "✓", "✓"] },
    { label: "Revision rounds", values: ["—", "1", "2"] },
    { label: "Formats delivered", values: ["2", "3", "All, incl. print-ready PDF"] },
  ];

  return (
    <>
      <PageHeader>
        <Callout>E-book creation</Callout>
        <h1 className="mt-4">E-book creation, done properly.</h1>
        <Standfirst>
          Send a manuscript. Get back files that open cleanly on every reader, with a cover that doesn&rsquo;t look
          like a template — unless you want the template, which is fine too.
        </Standfirst>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/self-publishing/wizard/step-1" className={buttonClass("primary", "lg")}>
            Upload a manuscript
          </Link>
          <Link href="#questions" className={buttonClass("secondary", "lg")}>
            Get a quote first
          </Link>
        </div>
      </PageHeader>

      <Wrap as="section" className="py-12">
        <SectionHead title="Three packages" standfirst="Prices are fixed. No hourly billing, no surprise line items." />
        <TableWrap>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH_CLASS}>What you get</th>
                {services.map((service) => (
                  <th key={service.id} className={TH_CLASS}>
                    {service.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={ROW_TH_CLASS}>
                  Price
                </th>
                {services.map((service, index) => (
                  <td key={service.id} className={`${TD_CLASS} tabular-nums`}>
                    <strong className="text-[17px]">{formatINRWhole(service.priceCents)}</strong>
                    {index === 1 && (
                      <span className="mt-1.5 block">
                        <Callout>Most popular</Callout>
                      </span>
                    )}
                  </td>
                ))}
              </tr>
              {featureRows.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className={ROW_TH_CLASS}>
                    {row.label}
                  </th>
                  {services.map((service, index) => (
                    <td key={service.id} className={TD_CLASS}>
                      {row.values[index] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className={TD_CLASS} />
                {services.map((service, index) => (
                  <td key={service.id} className={TD_CLASS}>
                    <Link
                      href={`/services/${service.slug}`}
                      className={buttonClass(index === 1 ? "primary" : "secondary", "sm")}
                    >
                      Choose {service.title.split(" ")[0]}
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </TableWrap>
      </Wrap>

      <PlanBand
        eyebrow="The process"
        title="Four steps, in this order."
        standfirst="Every project moves through the same sequence — you can see which step yours is on from your dashboard at any time."
        plans={PROCESS.map((step) => ({ tag: step.tag, title: step.title, points: step.points }))}
      />

      <Wrap as="section" className="py-12">
        <SectionHead title="Add-ons" standfirst="Bolt these onto any package." />
        <TableWrap>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH_CLASS}>Add-on</th>
                <th className={TH_CLASS}>Price</th>
                <th className={TH_CLASS}>Adds to turnaround</th>
                <th className={TH_CLASS}>What it covers</th>
              </tr>
            </thead>
            <tbody>
              {SERVICE_ADDONS.map((addon) => {
                const detail = ADDON_DETAIL[addon.name];
                return (
                  <tr key={addon.name}>
                    <td className={TD_CLASS}>{addon.name}</td>
                    <td className={`${TD_CLASS} tabular-nums`}>{formatINRWhole(addon.priceCents)}</td>
                    <td className={`${TD_CLASS} tabular-nums`}>{detail?.turnaround ?? "—"}</td>
                    <td className={TD_CLASS}>{detail?.covers ?? "—"}</td>
                  </tr>
                );
              })}
              <tr>
                <td className={TD_CLASS}>Storefront listing</td>
                <td className={TD_CLASS}>Free</td>
                <td className={`${TD_CLASS} tabular-nums`}>+1 day</td>
                <td className={TD_CLASS}>Your title goes live here, royalties paid monthly</td>
              </tr>
            </tbody>
          </table>
        </TableWrap>
      </Wrap>

      <Wrap as="section" id="questions" className="scroll-mt-6 pb-12">
        <SectionHead title="Questions authors ask first" />
        <FaqList items={FAQS} />
      </Wrap>
    </>
  );
}
