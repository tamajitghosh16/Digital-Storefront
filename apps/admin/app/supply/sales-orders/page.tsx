import { bookFormatLabel, deliveryType, prisma, type Prisma } from "@repo/database";
import { PageHeader } from "@/components/ui";
import { requireStaffPage } from "@/lib/guard";
import { SalesOrdersList, type SalesOrderAddress, type SalesOrderRow } from "./sales-orders-list";

// Every order a customer has actually placed — paid online, or ordered cash
// on delivery. An online checkout that was never paid isn't a sale yet, so
// it stays off this list: unpaid orders have no shipment status and a status
// of PENDING (or CANCELLED, once the attempt is abandoned).
const PLACED_ORDER: Prisma.OrderWhereInput = {
  OR: [
    { shipmentStatus: { not: null } },
    { status: { in: ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "READY_FOR_DOWNLOAD", "REFUNDED"] } },
  ],
};

const ORDER_INCLUDE = {
  user: { select: { name: true, email: true } },
  payment: { select: { method: true, status: true } },
  items: { include: { product: { select: { title: true } } } },
} satisfies Prisma.OrderInclude;

type OrderWithDetails = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export default async function SalesOrdersPage() {
  await requireStaffPage();
  const orders = await prisma.order.findMany({
    where: PLACED_ORDER,
    include: ORDER_INCLUDE,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="max-w-6xl pt-10">
      <PageHeader
        title="Sales Orders"
        description="Orders placed by customers, newest first. Accept or deny each new order with printed items, then move it along as it's packed and delivered. E-books are delivered automatically."
      />
      <SalesOrdersList orders={orders.map(toRow)} />
    </div>
  );
}

function toRow(order: OrderWithDetails): SalesOrderRow {
  const address = parseAddress(order.shippingAddress);
  return {
    id: order.id,
    // The same short reference the customer sees on their Orders page.
    ref: `#${order.id.slice(-5)}`,
    createdAt: order.createdAt.toISOString(),
    status: order.status,
    shipmentStatus: order.shipmentStatus,
    deliveryType: deliveryType(order.items),
    itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    discountCode: order.discountCode,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    customer: {
      name: order.user?.name || address?.name || null,
      email: order.user?.email ?? order.guestEmail ?? address?.email ?? null,
    },
    shippingAddress: address,
    gstNumber: order.gstNumber,
    payment: order.payment ? { method: order.payment.method, status: order.payment.status } : null,
    items: order.items.map((item) => {
      const format = item.bookFormat ? bookFormatLabel(item.bookFormat) : null;
      return {
        id: item.id,
        title: item.product.title,
        formatLabel: format && item.includesEbook && item.bookFormat !== "EBOOK" ? `${format} + E-book` : format,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        offline: item.fulfillmentType === "SHIP",
      };
    }),
  };
}

/** `Order.shippingAddress` is untyped JSON — the checkout snapshot, or nothing usable. */
function parseAddress(value: Prisma.JsonValue): SalesOrderAddress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const text = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : "");
  if (!text("line1") || !text("postalCode")) return null;
  return {
    name: text("name"),
    email: text("email"),
    line1: text("line1"),
    line2: text("line2") || null,
    district: text("district"),
    city: text("city"),
    state: text("state"),
    postalCode: text("postalCode"),
  };
}
