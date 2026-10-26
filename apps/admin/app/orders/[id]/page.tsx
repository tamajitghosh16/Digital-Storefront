import { notFound } from "next/navigation";
import { bookFormatLabel, prisma, type FulfillmentType, type Prisma } from "@repo/database";
import { ErrorBanner, Field, PageHeader, Pill, SavedBanner, Section, Table, controlClass } from "@/components/ui";
import { SaveButton } from "@/components/form-controls";
import { requireStaffPage } from "@/lib/guard";
import { markCashCollected, updateOrder } from "../actions";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  SUGGESTED_CARRIERS,
  canMarkCashCollected,
  nextStatusHelp,
  nextStatuses,
  orderRef,
  orderStatusTone,
  paymentStatusLabel,
} from "../order-status";

// One order: what was bought, where it goes, and the controls that move it
// along (status, courier + tracking number, COD cash collected). Every move
// is checked again in ../actions.ts; this page only offers the ones that
// make sense from where the order is now.

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const dateTime = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Asia/Kolkata",
});

const FULFILMENT_LABEL: Record<FulfillmentType, string> = {
  SHIP: "Sent by courier",
  DIGITAL: "Download",
  SERVICE: "Service",
};

const AUDIT_LABEL: Record<string, string> = {
  "order.status_changed": "Status changed",
  "order.tracking_updated": "Tracking details changed",
  "order.cod_collected": "Cash collected",
};

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  await requireStaffPage();
  const { id } = await params;
  const { error, saved } = await searchParams;

  const [order, history] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        user: { select: { email: true, name: true } },
        items: { include: { product: { select: { title: true } } } },
      },
    }),
    prisma.auditLog.findMany({
      where: { entity: "Order", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  if (!order) notFound();

  const ships = order.items.some((item) => item.fulfillmentType === "SHIP");
  const isCod = order.payment?.method === "COD";
  const choices = nextStatuses({ status: order.status, ships, paymentReceived: order.payment?.status === "CAPTURED" });
  const address = readAddress(order.shippingAddress);
  const customerName = address?.name ?? order.user?.name ?? null;
  const customerEmail = order.user?.email ?? order.guestEmail ?? address?.email ?? null;
  const canEditTracking = ships && order.status !== "CANCELLED" && order.status !== "REFUNDED";

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        title={`Order ${orderRef(order.id)}`}
        description={`Placed ${dateTime.format(order.createdAt)}${customerName ? ` by ${customerName}` : ""}.`}
        backHref="/orders"
        backLabel="Orders"
        action={<Pill tone={orderStatusTone(order.status)}>{ORDER_STATUS_LABEL[order.status]}</Pill>}
      />

      <ErrorBanner message={error} />
      <SavedBanner message={saved} />

      {(choices.length > 0 || canEditTracking) && (
        <Section
          title="Update this order"
          description="The customer sees each change on their My Orders page straight away."
        >
          <form action={updateOrder.bind(null, order.id)} className="space-y-5">
            <input type="hidden" name="expectedStatus" value={order.status} />

            {choices.length > 0 && (
              <fieldset className="space-y-2.5">
                <legend className="mb-2 text-sm font-semibold text-ink">What&rsquo;s happened with it?</legend>
                <StatusChoice value="" label={`Keep it as “${ORDER_STATUS_LABEL[order.status]}”`} defaultChecked />
                {choices.map((status) => (
                  <StatusChoice
                    key={status}
                    value={status}
                    label={ships || status !== "DELIVERED" ? ORDER_STATUS_LABEL[status] : "Completed"}
                    help={nextStatusHelp(status, ships)}
                  />
                ))}
              </fieldset>
            )}

            {canEditTracking && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Courier"
                  htmlFor="carrier"
                  help="Who's delivering the parcel. Delhivery, Shiprocket and Blue Dart give the customer a tracking link."
                >
                  <input
                    id="carrier"
                    name="carrier"
                    list="carrier-suggestions"
                    defaultValue={order.carrier ?? ""}
                    maxLength={60}
                    autoComplete="off"
                    className={controlClass}
                  />
                  <datalist id="carrier-suggestions">
                    {SUGGESTED_CARRIERS.map((carrier) => (
                      <option key={carrier} value={carrier} />
                    ))}
                  </datalist>
                </Field>
                <Field
                  label="Tracking number"
                  htmlFor="trackingNumber"
                  help="From the courier's receipt (sometimes called the AWB number)."
                >
                  <input
                    id="trackingNumber"
                    name="trackingNumber"
                    defaultValue={order.trackingNumber ?? ""}
                    maxLength={60}
                    autoComplete="off"
                    className={controlClass}
                  />
                </Field>
              </div>
            )}

            <SaveButton>Save</SaveButton>
          </form>
        </Section>
      )}

      {isCod && order.payment && (
        <Section
          title="Cash on delivery"
          description={`The customer pays ${money.format(order.payment.amountCents / 100)} in cash when the parcel arrives.`}
        >
          {canMarkCashCollected(order) ? (
            <form action={markCashCollected.bind(null, order.id)} className="flex flex-wrap items-center gap-4">
              <p className="text-sm text-ink-muted">Once the courier has collected the cash, record it here.</p>
              <SaveButton variant="secondary" pendingLabel="Recording…">
                Mark cash collected
              </SaveButton>
            </form>
          ) : (
            <p className="text-sm text-ink-muted">
              {order.payment.status === "CAPTURED"
                ? "The cash has been collected."
                : order.status === "CANCELLED"
                  ? "Nothing to collect — the order was cancelled."
                  : "You can mark the cash collected once the order has been shipped."}
            </p>
          )}
        </Section>
      )}

      <Section title="What they ordered">
        <Table
          head={
            <>
              <th>Item</th>
              <th>How it&rsquo;s sent</th>
              <th>Qty</th>
              <th>Price</th>
              <th>Line total</th>
            </>
          }
        >
          {order.items.map((item) => (
            <tr key={item.id}>
              <td>
                <span className="font-semibold text-ink">{item.product.title}</span>
                {item.bookFormat && (
                  <span className="text-ink-muted">
                    {" "}
                    · {bookFormatLabel(item.bookFormat)}
                    {item.includesEbook && item.bookFormat !== "EBOOK" ? " + E-book" : ""}
                  </span>
                )}
              </td>
              <td className="text-ink-muted">{FULFILMENT_LABEL[item.fulfillmentType]}</td>
              <td className="tabular-nums">{item.quantity}</td>
              <td className="tabular-nums">{money.format(item.unitPriceCents / 100)}</td>
              <td className="tabular-nums">{money.format((item.unitPriceCents * item.quantity) / 100)}</td>
            </tr>
          ))}
        </Table>
        <dl className="ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1.5 text-sm">
          <dt className="text-ink-muted">Items</dt>
          <dd className="text-right tabular-nums">{money.format(order.subtotalCents / 100)}</dd>
          {order.discountCents > 0 && (
            <>
              <dt className="text-ink-muted">Discount{order.discountCode ? ` (${order.discountCode})` : ""}</dt>
              <dd className="text-right tabular-nums">−{money.format(order.discountCents / 100)}</dd>
            </>
          )}
          <dt className="text-ink-muted">Delivery</dt>
          <dd className="text-right tabular-nums">{money.format(order.shippingCents / 100)}</dd>
          <dt className="font-semibold text-ink">Total</dt>
          <dd className="text-right font-semibold tabular-nums text-ink">{money.format(order.totalCents / 100)}</dd>
        </dl>
      </Section>

      <div className="grid gap-6 sm:grid-cols-2">
        <Section title="Customer">
          <div className="text-sm leading-relaxed text-ink">
            {customerName && <p className="font-semibold">{customerName}</p>}
            {customerEmail && <p className="text-ink-muted">{customerEmail}</p>}
            {address ? (
              <p className="mt-3">
                {address.line1}
                {address.line2 && (
                  <>
                    <br />
                    {address.line2}
                  </>
                )}
                <br />
                {[address.city, address.district].filter(Boolean).join(", ")}
                <br />
                {address.state} {address.postalCode}
              </p>
            ) : (
              ships && <p className="mt-3 text-ink-muted">No delivery address was saved with this order.</p>
            )}
            {order.gstNumber && <p className="mt-3 text-ink-muted">GST number: {order.gstNumber}</p>}
          </div>
        </Section>

        <Section title="Payment">
          {order.payment ? (
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 text-sm">
              <dt className="text-ink-muted">Paid by</dt>
              <dd className="text-ink">{order.payment.method ? PAYMENT_METHOD_LABEL[order.payment.method] : "Not chosen yet"}</dd>
              <dt className="text-ink-muted">Money</dt>
              <dd className="text-ink">{paymentStatusLabel(order.payment.status, order.payment.method)}</dd>
            </dl>
          ) : (
            <p className="text-sm text-ink-muted">No payment has been started for this order.</p>
          )}
        </Section>
      </div>

      {history.length > 0 && (
        <Section title="History" description="Every change staff have made to this order, newest first.">
          <ul className="space-y-2 text-sm">
            {history.map((entry) => (
              <li key={entry.id} className="flex flex-wrap gap-x-2">
                <span className="tabular-nums text-ink-muted">{dateTime.format(entry.createdAt)}</span>
                <span className="text-ink">{describeChange(entry.action, entry.diff)}</span>
                {entry.actorEmail && <span className="text-ink-muted">by {entry.actorEmail}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}

function StatusChoice({
  value,
  label,
  help,
  defaultChecked,
}: {
  value: string;
  label: string;
  help?: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-btn border border-line bg-tile-3 p-3.5 transition-colors hover:border-brand/50 has-[:checked]:border-brand">
      <input
        type="radio"
        name="status"
        value={value}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {help && <span className="mt-0.5 block text-[13px] leading-snug text-ink-muted">{help}</span>}
      </span>
    </label>
  );
}

interface Address {
  name: string | null;
  email: string | null;
  line1: string;
  line2: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
}

/**
 * The delivery address copied onto the order at checkout (apps/web's
 * `OrderShippingAddress`). Read defensively — it's JSON, and older orders
 * have none.
 */
function readAddress(value: Prisma.JsonValue): Address | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const text = (key: string) => {
    const field = value[key];
    return typeof field === "string" && field.trim() ? field : null;
  };
  const line1 = text("line1");
  if (!line1) return null;
  return {
    name: text("name"),
    email: text("email"),
    line1,
    line2: text("line2"),
    district: text("district"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postalCode"),
  };
}

/** One history line in plain words, from an AuditLog row's action + diff. */
function describeChange(action: string, diff: Prisma.JsonValue): string {
  const label = AUDIT_LABEL[action] ?? "Updated";
  if (!diff || typeof diff !== "object" || Array.isArray(diff)) return label;
  const status = diff.status;
  if (status && typeof status === "object" && !Array.isArray(status)) {
    const from = ORDER_STATUS_LABEL[status.from as keyof typeof ORDER_STATUS_LABEL];
    const to = ORDER_STATUS_LABEL[status.to as keyof typeof ORDER_STATUS_LABEL];
    if (from && to) return `${from} → ${to}`;
  }
  return label;
}
