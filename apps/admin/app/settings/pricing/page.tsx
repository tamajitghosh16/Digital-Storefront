import { DEFAULT_PRICING_CONFIG, PRICING_SETTINGS_ID, bpsToRate, prisma, rateToBps } from "@repo/database";
import {
  ErrorBanner,
  FieldRow,
  MoneyField,
  PageHeader,
  Pill,
  SavedBanner,
  Section,
  Table,
  TextField,
  controlClass,
} from "@/components/ui";
import { ConfirmButton, LinkButton, SaveButton } from "@/components/form-controls";
import {
  createDiscountCode,
  deleteClassSetTier,
  deleteDiscountCode,
  saveClassSetTier,
  toggleDiscountCode,
  updatePricingSettings,
} from "./actions";
import { toPercent, toRupees } from "./schema";

// FR-11.1: every price rule that isn't attached to a single product. Per-book
// prices stay on the book itself, under Books & products.

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { saved, error } = await searchParams;

  const [settings, tiers, codes] = await Promise.all([
    prisma.pricingSettings.findUnique({ where: { id: PRICING_SETTINGS_ID } }),
    prisma.classSetTier.findMany({ orderBy: { quantity: "asc" } }),
    prisma.discountCode.findMany({ orderBy: { code: "asc" } }),
  ]);

  // Never saved? Show the values the storefront is actually using right now,
  // so the form is a true reflection of the site rather than a set of zeroes.
  const defaults = DEFAULT_PRICING_CONFIG;
  const current = {
    freeDeliveryOverCents: settings?.freeDeliveryOverCents ?? defaults.delivery.freeOverCents,
    expressFeeCents: settings?.expressFeeCents ?? defaults.delivery.expressFeeCents,
    sameDayFeeCents: settings?.sameDayFeeCents ?? defaults.delivery.sameDayFeeCents,
    standardEta: settings?.standardEta ?? defaults.delivery.standardEta,
    expressEta: settings?.expressEta ?? defaults.delivery.expressEta,
    sameDayEta: settings?.sameDayEta ?? defaults.delivery.sameDayEta,
    bundleEbookAddCents: settings?.bundleEbookAddCents ?? defaults.bundleEbookAddCents,
    ebookGstBps: settings?.ebookGstBps ?? rateToBps(defaults.gstRates.EBOOK),
    serviceGstBps: settings?.serviceGstBps ?? rateToBps(defaults.gstRates.SERVICE_PACKAGE),
    classSetBaseCents: settings?.classSetBaseCents ?? defaults.classSetBaseCents,
  };

  return (
    <div className="max-w-4xl space-y-5">
      <PageHeader
        title="Pricing & delivery"
        description="The charges that apply across the whole shop. The price of an individual book is set on the book itself, under Books & products."
      />

      <ErrorBanner message={error} />
      {saved && <SavedBanner message="Pricing saved. The storefront is using it now." />}

      <form action={updatePricingSettings} className="space-y-5">
        <Section
          title="Delivery"
          description="What postage costs, and what the storefront promises about arrival. The arrival wording is shown to shoppers exactly as you type it."
        >
          <FieldRow>
            <MoneyField
              label="Free delivery on orders over"
              help="Orders at or above this total ship free on standard delivery."
              name="freeDeliveryOver"
              defaultValue={toRupees(current.freeDeliveryOverCents)}
              required
            />
            <TextField
              label="Standard delivery arrives"
              help='For example: "in 3-5 working days".'
              name="standardEta"
              defaultValue={current.standardEta}
              required
            />
            <MoneyField
              label="Express delivery costs"
              name="expressFee"
              defaultValue={toRupees(current.expressFeeCents)}
              required
            />
            <TextField
              label="Express delivery arrives"
              name="expressEta"
              defaultValue={current.expressEta}
              required
            />
            <MoneyField
              label="Same-day delivery costs"
              name="sameDayFee"
              defaultValue={toRupees(current.sameDayFeeCents)}
              required
            />
            <TextField
              label="Same-day delivery arrives"
              name="sameDayEta"
              defaultValue={current.sameDayEta}
              required
            />
          </FieldRow>
        </Section>

        <Section
          title="Bundles and tax"
          description="Prices on the storefront always include GST — the tax is shown as part of the price, not added at checkout. Printed books are nil-rated and have no setting."
        >
          <FieldRow>
            <MoneyField
              label="Add the e-book to a printed copy for"
              help="What “Both editions” costs on top of the printed price."
              name="bundleEbookAdd"
              defaultValue={toRupees(current.bundleEbookAddCents)}
              required
            />
            <div />
            <PercentField
              label="GST on e-books"
              name="ebookGst"
              defaultValue={toPercent(current.ebookGstBps)}
            />
            <PercentField
              label="GST on services"
              help="Self-publishing packages and e-book creation."
              name="serviceGst"
              defaultValue={toPercent(current.serviceGstBps)}
            />
          </FieldRow>
        </Section>

        <Section
          title="Class-set example"
          description="The homepage shows a small table of bulk prices. This is the single-copy price it works from."
        >
          <MoneyField
            label="Example single-copy price"
            help="Only used for that homepage table — it doesn't change what anything actually sells for."
            name="classSetBase"
            defaultValue={toRupees(current.classSetBaseCents)}
            required
          />
        </Section>

        <div className="flex items-center gap-3">
          <SaveButton>Save pricing</SaveButton>
        </div>
      </form>

      {/* ── Class-set tiers ─────────────────────────────────────────── */}
      <Section
        title="Bulk discounts (class sets)"
        description="Schools buying the same title in quantity get a lower per-copy price. Buying a single copy is always full price."
      >
        {tiers.length > 0 ? (
          <Table
            head={
              <>
                <th>Copies</th>
                <th>Discount</th>
                <th>Example per copy</th>
                <th className="text-right">&nbsp;</th>
              </>
            }
          >
            {tiers.map((tier) => (
              <tr key={tier.id}>
                <td className="font-semibold">{tier.quantity}+</td>
                <td>{toPercent(tier.discountBps)}% off</td>
                <td className="tabular-nums text-ink-muted">
                  {money.format(
                    (Math.round((current.classSetBaseCents * (1 - bpsToRate(tier.discountBps))) / 100) * 100) / 100
                  )}
                </td>
                <td className="text-right">
                  <form action={deleteClassSetTier.bind(null, tier.id)}>
                    <ConfirmButton message={`Remove the ${tier.quantity}-copy discount?`}>Remove</ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-sm text-ink-muted">
            No bulk discounts yet — every quantity is charged at full price.
          </p>
        )}

        <form action={saveClassSetTier} className="flex flex-wrap items-end gap-3 border-t border-line pt-5">
          <label className="text-sm">
            <span className="block font-semibold text-ink">Copies</span>
            <input
              name="quantity"
              type="number"
              min={2}
              step={1}
              required
              placeholder="10"
              className={`${controlClass} mt-1.5 w-28`}
            />
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-ink">Discount %</span>
            <input
              name="discount"
              type="number"
              min={0}
              max={100}
              step="0.5"
              required
              placeholder="10"
              className={`${controlClass} mt-1.5 w-28`}
            />
          </label>
          <SaveButton variant="secondary" pendingLabel="Adding…">
            Add or update
          </SaveButton>
          <p className="w-full text-[13px] text-ink-muted">
            Entering a quantity that already has a discount replaces it.
          </p>
        </form>
      </Section>

      {/* ── Discount codes ──────────────────────────────────────────── */}
      <Section
        title="Discount codes"
        description="Codes shoppers can type at checkout. Turning one off keeps it on this list but stops it working."
      >
        {codes.length > 0 ? (
          <Table
            head={
              <>
                <th>Code</th>
                <th>Takes off</th>
                <th>Message shown</th>
                <th>Status</th>
                <th className="text-right">&nbsp;</th>
              </>
            }
          >
            {codes.map((code) => (
              <tr key={code.id}>
                <td className="font-mono text-sm font-bold">{code.code}</td>
                <td>{toPercent(code.rateBps)}%</td>
                <td className="text-ink-muted">{code.blurb || "—"}</td>
                <td>
                  <Pill tone={code.isActive ? "on" : "off"}>{code.isActive ? "Working" : "Off"}</Pill>
                </td>
                <td className="space-x-4 text-right">
                  <form action={toggleDiscountCode.bind(null, code.id)} className="inline">
                    <LinkButton>{code.isActive ? "Turn off" : "Turn on"}</LinkButton>
                  </form>
                  <form action={deleteDiscountCode.bind(null, code.id)} className="inline">
                    <ConfirmButton message={`Delete the code ${code.code}? Shoppers using it will stop getting the discount.`}>
                      Delete
                    </ConfirmButton>
                  </form>
                </td>
              </tr>
            ))}
          </Table>
        ) : (
          <p className="text-sm text-ink-muted">No discount codes yet.</p>
        )}

        <form action={createDiscountCode} className="flex flex-wrap items-end gap-3 border-t border-line pt-5">
          <label className="text-sm">
            <span className="block font-semibold text-ink">Code</span>
            <input
              name="code"
              required
              placeholder="SCHOOL5"
              className={`${controlClass} mt-1.5 w-40 uppercase`}
            />
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-ink">Takes off %</span>
            <input
              name="rate"
              type="number"
              min="0.01"
              max="100"
              step="0.5"
              required
              placeholder="5"
              className={`${controlClass} mt-1.5 w-28`}
            />
          </label>
          <label className="min-w-[14rem] flex-1 text-sm">
            <span className="block font-semibold text-ink">Message shown when it works</span>
            <input name="blurb" placeholder="5% off this order." className={`${controlClass} mt-1.5`} />
          </label>
          <SaveButton variant="secondary" pendingLabel="Adding…">
            Add code
          </SaveButton>
        </form>
      </Section>
    </div>
  );
}

function PercentField({
  label,
  help,
  name,
  defaultValue,
}: {
  label: string;
  help?: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-semibold text-ink">
        {label}
      </label>
      {help && <p className="mt-0.5 text-[13px] leading-snug text-ink-muted">{help}</p>}
      <div className="mt-2 flex items-center rounded-btn border border-line bg-ground focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/30">
        <input
          id={name}
          name={name}
          type="number"
          min={0}
          max={100}
          step="0.5"
          required
          defaultValue={defaultValue}
          className="w-full bg-transparent px-3 py-2.5 text-sm text-ink focus:outline-none"
        />
        <span className="pr-3 text-sm font-semibold text-ink-muted" aria-hidden>
          %
        </span>
      </div>
    </div>
  );
}
