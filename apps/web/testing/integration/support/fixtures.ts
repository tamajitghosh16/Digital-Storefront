import { randomUUID } from "node:crypto";
import { prisma } from "@repo/database";

// Minimal rows for integration tests. Each helper takes overrides so a test
// states only what it's about.

export async function createCustomer(overrides: { email?: string } = {}) {
  return prisma.user.create({
    data: { id: randomUUID(), email: overrides.email ?? `reader-${randomUUID()}@example.test`, name: "Test Reader" },
  });
}

export async function createBook(stock: { paperback?: number | null } = {}) {
  return prisma.product.create({
    data: {
      type: "PHYSICAL_BOOK",
      productLine: "BOOK",
      title: "Integration Test Book",
      author: "A. Writer",
      slug: `test-book-${randomUUID()}`,
      priceCents: 49_900,
      editions: {
        create: [{ format: "PAPERBACK", priceCents: 49_900, stockQty: stock.paperback === undefined ? 5 : stock.paperback }],
      },
    },
  });
}

export async function createChart(stockQty: number | null) {
  return prisma.product.create({
    data: {
      type: "PHYSICAL_BOOK",
      productLine: "EDUCATIONAL_CHART",
      title: "Integration Test Chart",
      author: "The Press",
      slug: `test-chart-${randomUUID()}`,
      priceCents: 19_900,
      stockQty,
    },
  });
}

/** A PENDING online order with its Razorpay-backed Payment row, as `startCheckout` leaves it. */
export async function createPendingOrder(options: { totalCents?: number; gatewayOrderId?: string } = {}) {
  const customer = await createCustomer();
  const book = await createBook();
  const totalCents = options.totalCents ?? 49_900;
  const order = await prisma.order.create({
    data: {
      userId: customer.id,
      subtotalCents: totalCents,
      totalCents,
      items: {
        create: [
          { productId: book.id, quantity: 1, unitPriceCents: totalCents, fulfillmentType: "SHIP", bookFormat: "PAPERBACK" },
        ],
      },
      payment: {
        create: { amountCents: totalCents, gatewayOrderId: options.gatewayOrderId ?? `order_${randomUUID()}` },
      },
    },
    include: { payment: true },
  });
  return { order, payment: order.payment!, customer, book };
}
