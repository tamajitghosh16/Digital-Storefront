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
  ROW_TH_CLASS,
  TableWrap,
  Wrap,
  buttonClass,
} from "@/components/primitives";
import { FaqList, PlanBand } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Digital Tracking System",
  description:
    "The Digital Tracking System is register-and-custody software for chambers, clinics and small institutions — case files, exhibits and assets with a full custody trail, SLA timers and one-click exports.",
};

// Digital & Tech Solutions · productivity software delivered either as a
// direct file entitlement (self-hosted) or a hosted access credential.
// Static content — no Prisma `Product` row for this line yet.

const FEATURES = [
  {
    title: "One register for everything you hold",
    body: "Case files, exhibits, physical assets and returnable documents in a single searchable list with custom fields.",
  },
  {
    title: "Chain of custody",
    body: "Every hand-off is signed, timestamped and immutable, so you can always show who had what, and when.",
  },
  {
    title: "SLA and return timers",
    body: "Set a due date on any item; the dashboard surfaces what is overdue, due today and due this week.",
  },
  {
    title: "Role-based access",
    body: "Partners, associates, clerks and interns see only what their role allows, with a full audit log behind it.",
  },
  {
    title: "Barcode and QR labels",
    body: "Print a label sheet, scan an item in or out from a phone camera — no dedicated hardware required.",
  },
  {
    title: "Exports that satisfy an auditor",
    body: "CSV, XLSX or a signed PDF register for any date range, filtered by matter, custodian or asset class.",
  },
];

const DELIVERY = [
  {
    name: "Direct download",
    meta: "Self-hosted · one-time file entitlement",
    points: [
      "Docker image and SQL schema delivered to your library",
      "Runs on your own server or a ₹600/month VPS",
      "Perpetual licence, one year of updates included",
      "Your data never leaves your infrastructure",
    ],
  },
  {
    name: "Hosted access",
    meta: "We run it · per-seat access credential",
    featured: true,
    points: [
      "Provisioned within one working day",
      "Daily encrypted backups, 99.9% uptime target",
      "Updates and security patches applied for you",
      "Access tied to your storefront account",
    ],
  },
];

const PLANS = [
  {
    tag: "Solo",
    title: "Practitioner",
    price: "₹3,900",
    meta: "Perpetual · self-hosted · 1 user",
    points: ["Up to 1,000 tracked items", "Custody trail and timers", "CSV and PDF exports", "Community support"],
    cta: { label: "Buy the download", href: "#request-access" },
  },
  {
    tag: "Most chosen",
    title: "Team",
    price: "₹1,200",
    meta: "Per month · hosted · up to 10 users",
    points: [
      "Unlimited tracked items",
      "Role-based access and audit log",
      "Barcode / QR label printing",
      "Email and phone support",
    ],
    cta: { label: "Request access", href: "#request-access" },
    featured: true,
  },
  {
    tag: "Institution",
    title: "Institution",
    price: "Quoted",
    meta: "Hosted or on-premise · unlimited users",
    points: [
      "Everything in Team",
      "SSO and directory sync",
      "Custom fields and workflows",
      "Named implementation contact",
    ],
    cta: { label: "Get a quote", href: "#request-access" },
  },
];

const ROLLOUT = [
  { tag: "Week 1", title: "Set up", points: ["Import your existing register from a spreadsheet", "Define asset classes and custom fields"] },
  { tag: "Week 1", title: "Configure", points: ["Add people and assign roles", "Print the first label sheet"] },
  { tag: "Week 2", title: "Run parallel", points: ["Log new items in both systems", "Reconcile at the end of the week"] },
  { tag: "Week 3", title: "Cut over", points: ["Retire the old register", "Schedule the monthly signed export"] },
];

const SPEC_ROWS = [
  { label: "Self-hosted requirements", value: "Docker · 2 vCPU · 4 GB RAM · PostgreSQL 15" },
  { label: "Browsers", value: "Current Chrome, Edge, Firefox and Safari" },
  { label: "Mobile", value: "Progressive web app for in/out scanning; no install needed" },
  { label: "Data export", value: "CSV, XLSX, signed PDF — no lock-in, anytime" },
  { label: "Backups (hosted)", value: "Daily encrypted, 30-day retention, Indian region" },
  { label: "Account", value: "Same login as this storefront and the Naya Bandhu app" },
];

const FAQS = [
  {
    id: "which",
    question: "Direct download or hosted — which should I pick?",
    answer:
      "Pick the download if you already run a server and want your data to stay on it forever. Pick hosted if you would rather we handle backups, updates and uptime for a monthly fee. You can migrate from hosted to self-hosted later and keep your data.",
  },
  {
    id: "migrate",
    question: "We keep our register in Excel today. Can we move it in?",
    answer:
      "Yes. The setup step imports a spreadsheet directly — map your columns once and the history comes with it. Most chambers are running parallel within a day.",
  },
  {
    id: "audit",
    question: "Is the custody trail actually tamper-evident?",
    answer:
      "Each custody event is hash-chained to the one before it, so any edit or deletion breaks the chain visibly. The signed PDF register carries the same hashes for an outside auditor to verify.",
  },
  {
    id: "trust",
    question: "How does the trust pledge apply?",
    answer:
      "25% of every licence sale and every month of hosted access is contributed to the Sashibhusan Book Press Memorial Trust. It is itemised on your invoice.",
  },
];

export default function DigitalTrackingSystemPage() {
  return (
    <>
      <Wrap>
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Digital & Tech Solutions" },
            { label: "Digital Tracking System" },
          ]}
        />
      </Wrap>

      <PageHeader>
        <Callout tone="tile">Digital &amp; Tech Solutions</Callout>
        <h1 className="mt-4">Know what you&rsquo;re holding, and who has it.</h1>
        <Standfirst>
          Register every case file, exhibit and asset once. The Digital Tracking System keeps a tamper-evident custody
          trail, warns you before anything is overdue, and exports a register an auditor will accept.
        </Standfirst>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="#request-access" className={buttonClass("primary", "lg")}>
            Request access
          </Link>
          <Link href="#delivery" className={buttonClass("secondary", "lg")}>
            Compare download vs hosted
          </Link>
        </div>
      </PageHeader>

      <Wrap as="section" className="py-12">
        <SectionHead title="What it does" />
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
          {FEATURES.map((feature, i) => (
            <div key={feature.title} className="rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
              <span className="caps text-ink-subtle">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2">{feature.title}</h3>
              <p className="mt-2 text-sm leading-[1.6] text-ink-muted">{feature.body}</p>
            </div>
          ))}
        </div>
      </Wrap>

      <Wrap as="section" id="delivery" className="scroll-mt-6 pb-12">
        <SectionHead title="Two ways to get it" standfirst="Same software; you choose who runs it." />
        <div className="grid gap-4 sm:grid-cols-2">
          {DELIVERY.map((option) => (
            <div
              key={option.name}
              className={
                option.featured
                  ? "rounded-tile bg-ground p-6 inset-ring-[3px] inset-ring-ink"
                  : "rounded-tile bg-ground p-6 inset-ring inset-ring-line"
              }
            >
              <Callout tone={option.featured ? "brand" : "tile"}>
                {option.featured ? `${option.name} · most chosen` : option.name}
              </Callout>
              <p className="mt-3 text-sm text-ink-muted">{option.meta}</p>
              <CheckList className="mt-[18px]" items={option.points} />
            </div>
          ))}
        </div>
      </Wrap>

      <PlanBand
        eyebrow="Pricing"
        title="Buy it once, or pay by the month."
        standfirst="Self-hosted is a one-time licence. Hosted is billed monthly and cancellable. Every tier exports your full data on demand."
        plans={PLANS}
      />

      <Wrap as="section" className="py-12">
        <SectionHead title="A three-week rollout" standfirst="Run it alongside your current register until you trust it." />
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {ROLLOUT.map((step) => (
            <div key={step.title} className="rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
              <Callout tone="tile">{step.tag}</Callout>
              <h3 className="mt-3">{step.title}</h3>
              <CheckList className="mt-3" items={step.points} />
            </div>
          ))}
        </div>
      </Wrap>

      <Wrap as="section" className="pb-12">
        <SectionHead title="Specifications" />
        <TableWrap>
          <table className={TABLE_CLASS}>
            <tbody>
              {SPEC_ROWS.map((row) => (
                <tr key={row.label}>
                  <th scope="row" className={ROW_TH_CLASS}>
                    {row.label}
                  </th>
                  <td className={TD_CLASS}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Wrap>

      <Wrap as="section" id="request-access" className="scroll-mt-6 pb-12">
        <div className="rounded-tile bg-band px-7 py-10 text-band-ink min-[820px]:px-12 min-[820px]:py-12">
          <Callout>Request access</Callout>
          <h2 className="mt-3.5 text-[28px]">Tell us your setup and we&rsquo;ll provision or quote.</h2>
          <p className="mt-3 max-w-[54ch] text-[15px] leading-[1.6] text-band-muted">
            Hosted accounts are turned on within one working day. For the self-hosted download or an institution quote,
            we&rsquo;ll reply with next steps and a licence key.
          </p>
          <form className="mt-5 flex max-w-[520px] flex-wrap gap-2.5">
            <label htmlFor="dts-email" className="sr-only">
              Work email address
            </label>
            <input
              id="dts-email"
              type="email"
              required
              placeholder="you@organisation.in"
              className="h-[50px] min-w-[210px] flex-1 rounded-full border-2 border-band-plan-edge bg-ground px-5 text-ink focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-btn border-2 border-band-button bg-band-button px-4 py-3 text-base font-bold text-band-button-ink transition hover:brightness-150"
            >
              Request access
            </button>
          </form>
        </div>
      </Wrap>

      <Wrap as="section" className="pb-14">
        <SectionHead title="Questions" />
        <FaqList items={FAQS} />
      </Wrap>
    </>
  );
}
