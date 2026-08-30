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
  TH_CLASS,
  ROW_TH_CLASS,
  TableWrap,
  Wrap,
  buttonClass,
} from "@/components/primitives";
import { FaqList } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Indoor Plants (Chatterjee's Green Veranda)",
  description:
    "Chatterjee's Green Veranda — a small, well-chosen collection of indoor plants raised in Kolkata. Book a nursery visit or a local delivery; 25% of every sale is pledged to the trust.",
};

// Lifestyle · not sold through storefront checkout. Every plant is a
// living thing that needs a delivery window or a collection slot, so the
// page is a lookbook plus a booking request. Static content — no Prisma
// `Product` row for this line.

const PLANTS = [
  {
    name: "Areca Palm",
    latin: "Dypsis lutescens",
    price: "₹640",
    light: "Bright, indirect",
    water: "When top 2 cm dry",
    care: "Easy",
    from: "#e6f2ea",
    to: "#bcd9c5",
  },
  {
    name: "Snake Plant",
    latin: "Dracaena trifasciata",
    price: "₹420",
    light: "Low to bright",
    water: "Every 2–3 weeks",
    care: "Very easy",
    from: "#eaf1e4",
    to: "#c7d9b4",
  },
  {
    name: "Money Plant, moss pole",
    latin: "Epipremnum aureum",
    price: "₹560",
    light: "Indirect",
    water: "Weekly",
    care: "Easy",
    from: "#e4f0ee",
    to: "#b9d8d1",
  },
  {
    name: "Peace Lily",
    latin: "Spathiphyllum wallisii",
    price: "₹580",
    light: "Medium, indirect",
    water: "When it droops",
    care: "Moderate",
    from: "#eef1e8",
    to: "#cdd9bd",
  },
  {
    name: "ZZ Plant",
    latin: "Zamioculcas zamiifolia",
    price: "₹720",
    light: "Low to medium",
    water: "Every 3 weeks",
    care: "Very easy",
    from: "#e7efe6",
    to: "#c2d6b8",
  },
  {
    name: "Rubber Plant, burgundy",
    latin: "Ficus elastica",
    price: "₹860",
    light: "Bright, indirect",
    water: "When top 3 cm dry",
    care: "Moderate",
    from: "#efe9ea",
    to: "#d3c0c4",
  },
];

const CARE_LEVELS = [
  {
    level: "Very easy",
    body: "Forgives a missed watering or a dim corner. A good first plant, or one for a desk you travel from.",
  },
  {
    level: "Easy",
    body: "Wants a routine but not a careful one. Weekly water, a bright-ish spot, an occasional wipe of the leaves.",
  },
  {
    level: "Moderate",
    body: "Tells you when it's unhappy — drooping, browning tips — and recovers quickly once you adjust. Rewarding to keep.",
  },
];

const SERVICES = [
  { name: "Repotting & soil refresh", price: "₹250 / plant", detail: "New pot, fresh mix, root check — at the nursery or your home" },
  { name: "Plant-sitting", price: "₹120 / plant / week", detail: "Watering and light care while you're away, within Kolkata" },
  { name: "Office green plan", price: "From ₹1,800 / month", detail: "Fortnightly visit, replacements included, up to 15 plants" },
  { name: "Home consultation", price: "₹500, adjusted against a purchase", detail: "A walk-through to match plants to your light and habits" },
];

const DELIVERY_ZONES = [
  { zone: "South & Central Kolkata", fee: "₹80", window: "Next-day, choose morning or evening" },
  { zone: "North Kolkata, Salt Lake, New Town", fee: "₹120", window: "Within 2 days" },
  { zone: "Howrah & greater Kolkata", fee: "₹180", window: "Within 3 days, weekday slots" },
  { zone: "Nursery collection, Jadavpur", fee: "Free", window: "Book a 30-min slot, Tue–Sun" },
];

const FAQS = [
  {
    id: "buy",
    question: "Can I just check out and pay online?",
    answer:
      "Not for plants. Each one needs a delivery window or a collection slot so it isn't left in a lobby all day. Send a booking request with what you'd like and your area, and we'll confirm a time and a total, payable on delivery or at the nursery.",
  },
  {
    id: "area",
    question: "Do you deliver outside Kolkata?",
    answer:
      "Live plants only travel within Kolkata and the immediate suburbs so they arrive in good condition. Pots, tools and care kits can be couriered anywhere in India.",
  },
  {
    id: "guarantee",
    question: "What if the plant struggles after I get it home?",
    answer:
      "Tell us within 14 days. We'll talk through light and watering first, and if it's genuinely declining we'll replace it once, free, on your next delivery or visit.",
  },
  {
    id: "trust",
    question: "How does the 25% trust pledge work here?",
    answer:
      "A quarter of the value of every plant and service booking goes to the Sashibhusan Book Press Memorial Trust's urban-greening work — school planting days and neighbourhood nurseries. It's shown on the receipt you get at handover.",
  },
];

export default function IndoorPlantsPage() {
  return (
    <>
      <Wrap>
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Lifestyle" },
            { label: "Indoor Plants (Chatterjee's Green Veranda)" },
          ]}
        />
      </Wrap>

      <PageHeader>
        <Callout tone="tile">Lifestyle</Callout>
        <h1 className="mt-4">A few good plants, raised on a Kolkata veranda.</h1>
        <Standfirst>
          Chatterjee&rsquo;s Green Veranda is a small, deliberately short list of indoor plants that do well in Bengal
          homes and offices. Book a nursery visit or a local delivery &mdash; we bring the plant, the pot and the
          how-to.
        </Standfirst>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="#collection" className={buttonClass("primary", "lg")}>
            Browse the collection
          </Link>
          <Link href="#book" className={buttonClass("secondary", "lg")}>
            Book a visit or delivery
          </Link>
        </div>
      </PageHeader>

      <Wrap as="section" id="collection" className="scroll-mt-6 py-12">
        <SectionHead title="The collection" standfirst="Prices are per plant, in a plain terracotta or ceramic pot." />
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {PLANTS.map((plant) => (
            <div
              key={plant.name}
              className="overflow-hidden rounded-tile bg-ground inset-ring inset-ring-line shadow-tile"
            >
              <div
                aria-hidden
                className="h-40"
                style={{ backgroundImage: `linear-gradient(135deg, ${plant.from}, ${plant.to})` }}
              />
              <div className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                  <h3>{plant.name}</h3>
                  <span className="shrink-0 text-sm font-bold tabular-nums">{plant.price}</span>
                </div>
                <p className="mt-1 text-[13px] italic text-ink-subtle">{plant.latin}</p>
                <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[13px]">
                  <dt className="text-ink-subtle">Light</dt>
                  <dd>{plant.light}</dd>
                  <dt className="text-ink-subtle">Water</dt>
                  <dd>{plant.water}</dd>
                  <dt className="text-ink-subtle">Care</dt>
                  <dd>{plant.care}</dd>
                </dl>
              </div>
            </div>
          ))}
        </div>
      </Wrap>

      <Wrap as="section" className="pb-12">
        <SectionHead title="What the care levels mean" />
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {CARE_LEVELS.map((item) => (
            <div key={item.level} className="rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
              <Callout tone="tile">{item.level}</Callout>
              <p className="mt-3 text-sm leading-[1.6] text-ink-muted">{item.body}</p>
            </div>
          ))}
        </div>
      </Wrap>

      <Wrap as="section" className="pb-12">
        <SectionHead title="Care services" standfirst="Add any of these to a booking, or ask for them on their own." />
        <TableWrap>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH_CLASS}>Service</th>
                <th className={TH_CLASS}>Price</th>
                <th className={TH_CLASS}>What it covers</th>
              </tr>
            </thead>
            <tbody>
              {SERVICES.map((service) => (
                <tr key={service.name}>
                  <th scope="row" className={ROW_TH_CLASS}>
                    {service.name}
                  </th>
                  <td className={`${TD_CLASS} tabular-nums`}>{service.price}</td>
                  <td className={TD_CLASS}>{service.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Wrap>

      <Wrap as="section" className="pb-12">
        <SectionHead title="Delivery & collection" />
        <TableWrap>
          <table className={TABLE_CLASS}>
            <thead>
              <tr>
                <th className={TH_CLASS}>Area</th>
                <th className={TH_CLASS}>Fee</th>
                <th className={TH_CLASS}>When</th>
              </tr>
            </thead>
            <tbody>
              {DELIVERY_ZONES.map((zone) => (
                <tr key={zone.zone}>
                  <th scope="row" className={ROW_TH_CLASS}>
                    {zone.zone}
                  </th>
                  <td className={`${TD_CLASS} tabular-nums`}>{zone.fee}</td>
                  <td className={TD_CLASS}>{zone.window}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Wrap>

      <Wrap as="section" className="pb-12">
        <div className="flex flex-wrap items-center gap-4 rounded-tile bg-tile p-6 inset-ring inset-ring-card-edge">
          <span aria-hidden className="text-[26px] leading-none">
            ❦
          </span>
          <div className="min-w-[240px] flex-1">
            <h3>25% of every sale supports the trust</h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              The contribution funds school planting days and neighbourhood nurseries across Kolkata, and is itemised
              on the receipt you get at handover.
            </p>
          </div>
        </div>
      </Wrap>

      <Wrap as="section" id="book" className="scroll-mt-6 pb-12">
        <div className="rounded-tile bg-band px-7 py-10 text-band-ink min-[820px]:px-12 min-[820px]:py-12">
          <Callout>Book a visit or delivery</Callout>
          <h2 className="mt-3.5 text-[28px]">Tell us what you like and where you are.</h2>
          <p className="mt-3 max-w-[54ch] text-[15px] leading-[1.6] text-band-muted">
            Send the plants you&rsquo;re interested in and your area. We&rsquo;ll confirm what&rsquo;s in stock, a
            delivery window or a nursery slot, and a total &mdash; payable on handover.
          </p>
          <form className="mt-5 flex max-w-[520px] flex-wrap gap-2.5">
            <label htmlFor="plants-contact" className="sr-only">
              Email or phone
            </label>
            <input
              id="plants-contact"
              type="text"
              required
              placeholder="Email or phone, and your area"
              className="h-[50px] min-w-[210px] flex-1 rounded-full border-2 border-band-plan-edge bg-ground px-5 text-ink focus:outline-none"
            />
            <button
              type="submit"
              className="rounded-btn border-2 border-band-button bg-band-button px-4 py-3 text-base font-bold text-band-button-ink transition hover:brightness-150"
            >
              Send request
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
