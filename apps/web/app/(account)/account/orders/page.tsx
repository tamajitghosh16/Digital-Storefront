import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@repo/auth/server";
import { bookFormatLabel, prisma, type Prisma } from "@repo/database";
import { isHttpsUrl } from "@repo/security/href";
import { OrdersTable } from "@/components/account/orders-table";
import { SectionHead, buttonClass } from "@/components/primitives";
import { getCachedPricingConfig } from "@/lib/cms";
import type { OrderShippingAddress } from "@/lib/india-address";
import type { OrderDetail } from "@/lib/order-tracking";
import { lineProductHref } from "@/lib/product-lines";

export const metadata: Metadata = { title: "Orders" };

// FR-5.2/FR-8.3: order history with status tracking. Each row opens a
// detail pop-up (components/account/order-detail-dialog.tsx); everything
// it shows is loaded here in the one query, since a customer's history is
// small and it saves a round trip per click.
const ORDER_INCLUDE = {
  items: {
    include: {
      product: {
        select: { title: true, author: true, slug: true, type: true, productLine: true, coverImageUrl: true },
      },
    },
  },
  payment: { select: { method: true, status: true, updatedAt: true } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof ORDER_INCLUDE }>;

export default async function OrderHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string | string[] }>;
}) {
  const [user, { placed }, pricing] = await Promise.all([getCurrentUser(), searchParams, getCachedPricingConfig()]);
  // Real data only — never sample rows: a customer must see their own
  // orders or none, not someone else's (fake) history.
  const rows = user
    ? await prisma.order.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        include: ORDER_INCLUDE,
      })
    : [];
  const orders = rows.map(toOrderDetail);
  // Set by the payment page after a cash-on-delivery order; only ever
  // matched against this customer's own orders.
  const justPlacedId = typeof placed === "string" ? placed : undefined;

  return (
    <section>
      <SectionHead title="Orders" href="/account/library" hrefLabel="Digital library" />

      {orders.length === 0 ? (
        <div className="rounded-tile bg-tile px-6 py-14 text-center inset-ring inset-ring-card-edge">
          <h3>No orders yet</h3>
          <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
            Printed editions, e-books and service packages you buy will show up here.
          </p>
          <Link href="/educational-material/books" className={buttonClass("secondary", "md", "mt-5")}>
            Start browsing
          </Link>
        </div>
      ) : (
        <OrdersTable orders={orders} justPlacedId={justPlacedId} standardEta={pricing.delivery.standardEta} />
      )}
    </section>
  );
}

function toOrderDetail(order: OrderRow): OrderDetail {
  return {
    id: order.id,
    ref: `#${order.id.slice(-5)}`,
    status: order.status,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    discountCode: order.discountCode,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    shippingAddress: parseOrderAddress(order.shippingAddress),
    billingAddress: parseOrderAddress(order.billingAddress),
    gstNumber: order.gstNumber,
    carrier: order.carrier,
    trackingNumber: order.trackingNumber,
    payment: order.payment
      ? { method: order.payment.method, status: order.payment.status, updatedAt: order.payment.updatedAt.toISOString() }
      : null,
    items: order.items.map((item) => {
      const { product } = item;
      const format = item.bookFormat ? bookFormatLabel(item.bookFormat) : null;
      return {
        id: item.id,
        title: product.title,
        author: product.author,
        href:
          product.type === "SERVICE_PACKAGE"
            ? `/services/${product.slug}`
            : product.productLine === "BOOK" || product.type === "EBOOK"
              ? `/educational-material/books/${product.slug}`
              : (lineProductHref(product.productLine, product.slug) ?? null),
        // Only an https URL reaches next/image — a relative or http value
        // (legacy/seed rows) would make it throw and take the dialog down.
        coverImageUrl: isHttpsUrl(product.coverImageUrl) ? product.coverImageUrl : null,
        fulfillmentType: item.fulfillmentType,
        formatLabel: format && item.includesEbook && item.bookFormat !== "EBOOK" ? `${format} + E-book` : format,
        includesEbook: item.includesEbook,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
      };
    }),
  };
}

/**
 * `Order.shippingAddress` / `billingAddress` are untyped JSON; anything not
 * shaped like the checkout snapshot is dropped.
 */
function parseOrderAddress(value: Prisma.JsonValue): OrderShippingAddress | null {
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
    country: "IN",
  };
}
