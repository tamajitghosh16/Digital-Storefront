import type { Metadata } from "next";
import Link from "next/link";
import {
  Breadcrumb,
  Callout,
  PageHeader,
  SectionHead,
  Standfirst,
  TABLE_CLASS,
  TD_CLASS,
  ROW_TH_CLASS,
  TableWrap,
  Wrap,
} from "@/components/primitives";
import { FaqList, PlanBand } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Naya Bandhu (Application)",
  description:
    "Naya Bandhu is a mobile case-diary and hearing-reminder app for practising advocates — cause-list import, limitation alerts and an encrypted document vault, on iOS and Android.",
};

// Digital & Tech Solutions · the phone app. Distribution is App Store /
// Play Store, so the primary actions are store links (stubbed to "#"
// until the listings exist). Static content — no Prisma `Product` row.

const FEATURES = [
  {
    title: "Case diary that syncs",
    body: "Every matter, party and next date in one list, mirrored across your phone, tablet and the desktop web view.",
  },
  {
    title: "Hearing reminders",
    body: "A nudge the evening before and the morning of, with the court hall, item number and what the matter is listed for.",
  },
  {
    title: "Limitation alerts",
    body: "Enter the cause of action; the app counts down appeal, revision and filing limitation and warns you a fortnight out.",
  },
  {
    title: "Cause-list import",
    body: "Point it at the High Court or district cause list and it pulls your matters in — no retyping item numbers.",
  },
  {
    title: "Encrypted document vault",
    body: "Vakalatnamas, orders and briefs, encrypted on the device and in backup, shareable by expiring link.",
  },
  {
    title: "Works offline",
    body: "Full read and write access with no signal; changes reconcile the moment you are back on data or wifi.",
  },
];

const PLANS = [
  {
    tag: "Free",
    title: "Junior",
    price: "₹0",
    meta: "For the first three years at the bar",
    points: ["Up to 25 active matters", "Hearing reminders", "Limitation alerts", "1 GB vault"],
    cta: { label: "Create an account", href: "#get-the-app" },
  },
  {
    tag: "Most chosen",
    title: "Practitioner",
    price: "₹499",
    meta: "Per year, billed annually",
    points: [
      "Unlimited matters",
      "Cause-list import",
      "Desktop web view",
      "25 GB vault",
      "Priority support",
    ],
    cta: { label: "Start 30-day trial", href: "#get-the-app" },
    featured: true,
  },
  {
    tag: "Teams",
    title: "Chambers",
    price: "₹1,999",
    meta: "Per year, up to 5 members",
    points: [
      "Everything in Practitioner",
      "Shared matter list and calendar",
      "Clerk and intern roles",
      "100 GB shared vault",
    ],
    cta: { label: "Talk to us", href: "#get-the-app" },
  },
];

const SPEC_ROWS = [
  { label: "Platforms", value: "iOS 16 or later · Android 10 or later" },
  { label: "Download size", value: "≈ 48 MB (iOS) · ≈ 32 MB (Android)" },
  { label: "Languages", value: "English, Bengali, Hindi" },
  { label: "Data location", value: "Encrypted at rest; backups in a Mumbai region" },
  { label: "Offline", value: "Full read/write, background sync on reconnect" },
  { label: "Account", value: "Same login as this storefront and the Digital Tracking System" },
];

const FAQS = [
  {
    id: "who",
    question: "Is this the same thing as the printed Advocate's Diary?",
    answer:
      "They share the Naya Bandhu name and the ready-reckoner data, but this is the phone app — live sync, reminders and the document vault. Many advocates carry both.",
  },
  {
    id: "data",
    question: "Where does my case data live?",
    answer:
      "On your device, encrypted, with encrypted backups held in an Indian data-centre region. We cannot read your matters or your vault, and nothing is sold or shared.",
  },
  {
    id: "trial",
    question: "How does the trial work?",
    answer:
      "The Practitioner tier runs free for 30 days with no card required. If you do nothing at the end, the account drops to the Junior free tier rather than locking you out.",
  },
  {
    id: "trust",
    question: "Does the trust pledge apply here too?",
    answer:
      "Yes. 25% of every paid subscription is contributed to the Sashibhusan Book Press Memorial Trust, the same as the printed diary and the other professional lines.",
  },
];

function StoreButton({ store }: { store: "ios" | "android" }) {
  const label = store === "ios" ? "Download on the App Store" : "Get it on Google Play";
  const sub = store === "ios" ? "iOS 16 or later" : "Android 10 or later";
  return (
    <Link
      href="#get-the-app"
      className="inline-flex items-center gap-3 rounded-btn border-2 border-ink bg-ground px-5 py-3 text-left transition-colors hover:bg-tile"
    >
      <span aria-hidden className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink text-[13px] font-bold text-page">
        {store === "ios" ? "↓" : "▶"}
      </span>
      <span className="leading-tight">
        <span className="block text-[11px] font-bold uppercase tracking-[0.083em] text-ink-subtle">{sub}</span>
        <span className="block text-[15px] font-bold">{label}</span>
      </span>
    </Link>
  );
}

export default function NayaBandhuPage() {
  return (
    <>
      <Wrap>
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Digital & Tech Solutions" },
            { label: "Naya Bandhu (Application)" },
          ]}
        />
      </Wrap>

      <PageHeader>
        <Callout tone="tile">Digital &amp; Tech Solutions</Callout>
        <h1 className="mt-4">Your case diary, in your pocket, always in sync.</h1>
        <Standfirst>
          Naya Bandhu keeps every matter, next date and limitation deadline in one place, imports the cause list so you
          don&rsquo;t retype it, and keeps your briefs in an encrypted vault &mdash; on the phone, offline included.
        </Standfirst>
        <div className="mt-6 flex flex-wrap gap-3">
          <StoreButton store="ios" />
          <StoreButton store="android" />
        </div>
      </PageHeader>

      <Wrap as="section" className="py-12">
        <SectionHead title="What it does" standfirst="Built around how a hearing day actually goes." />
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

      <PlanBand
        eyebrow="Subscriptions"
        title="Free for juniors. Fair for everyone else."
        standfirst="One plan per person, or a shared plan for the chambers. Cancel from the app; your data stays exportable either way."
        plans={PLANS}
      />

      <Wrap as="section" className="py-12">
        <SectionHead title="Requirements" />
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

      <Wrap as="section" id="get-the-app" className="scroll-mt-6 pb-12">
        <div className="rounded-tile bg-band px-7 py-10 text-band-ink min-[820px]:px-12 min-[820px]:py-12">
          <Callout>Get the app</Callout>
          <h2 className="mt-3.5 text-[28px]">The store listings go live with version 1.0.</h2>
          <p className="mt-3 max-w-[54ch] text-[15px] leading-[1.6] text-band-muted">
            Leave your email and we&rsquo;ll send the App Store and Play Store links the day they publish, plus an
            invite to the beta if you want it sooner.
          </p>
          <form className="mt-5 flex max-w-[520px] flex-wrap gap-2.5">
            <label htmlFor="naya-bandhu-email" className="sr-only">
              Email address
            </label>
            <input
              id="naya-bandhu-email"
              type="email"
              required
              placeholder="you@chambers.in"
              className="h-[50px] min-w-[210px] flex-1 rounded-full border-2 border-band-plan-edge bg-ground px-5 text-ink focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-btn border-2 border-band-button bg-band-button px-4 py-3 text-base font-bold text-band-button-ink transition hover:brightness-150"
            >
              Notify me
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
