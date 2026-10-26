"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@repo/auth/server";
import {
  bookFormatLabel,
  discountAmountCents,
  getPricingConfig,
  gstAfterDiscountCents,
  parseLineId,
  prisma,
  type BookEdition,
  type BookFormat,
  type DiscountKind,
  type FulfillmentType,
  type Prisma,
  type Product,
} from "@repo/database";
import { inngest } from "@repo/jobs";
import { createRazorpayOrder, fetchGatewayPayment, verifyPaymentSignature } from "@repo/payments";
import { securityEvent } from "@repo/security/log";
import { RATE_LIMITS, clientIp, rateLimit } from "@repo/security/rate-limit";
import { isIndianState, type OrderBillingAddress, type OrderShippingAddress } from "@/lib/india-address";
import { resolveDiscount } from "@/lib/discounts";
import { ownsEbook } from "@/lib/library";
import { settleOrderPayment } from "@/lib/orders";
import { OutOfStockError, expireCachedStock, returnStock, takeStock, type StockLine } from "@/lib/stock";
import {
  deliveryFeeCents,
  includedGstCents,
  tierForQuantity,
  tierUnitCents,
  type TaxableType,
} from "@/lib/pricing";

/**
 * Checkout: turn the client cart into a real Order + Payment. Both ways in
 * start from the /payment page and are priced by the same `prepareOrder`:
 *
 *  - `placeCodOrder` — cash on delivery. No gateway: the order is confirmed
 *    straight away (PROCESSING) and its Payment stays CREATED, method COD,
 *    until the courier collects. Only for carts that ship entirely —
 *    e-books and services unlock on payment, so they can't be paid later.
 *  - `startCheckout` — online (UPI / net banking / cards) via Razorpay: hand
 *    back what the browser needs to open Razorpay Checkout, then verify the
 *    result with `confirmCheckout`.
 *
 * The Razorpay webhook (app/api/webhooks/razorpay/route.ts) remains the
 * authoritative, idempotent source of online order status. `confirmCheckout`
 * only flips PENDING → PAID early so the shopper can be redirected to their
 * library without waiting for the webhook round-trip; both go through
 * `settleOrderPayment` (lib/orders.ts), so whichever runs second is a no-op.
 *
 * Nothing from the browser is trusted: line prices are re-derived from
 * `Product` / `BookEdition`, only published, in-stock items in a format the
 * title is actually sold in can be bought, and a Razorpay receipt only
 * confirms the order it was issued for (docs/security-roadmap.md, C2/C3).
 */

/** Razorpay's minimum charge is ₹1 (100 paise). */
const MIN_ORDER_CENTS = 100;
/** Keeps `quantity × price` sums far away from Postgres `integer` overflow. */
const MAX_ORDER_CENTS = 100_000_000; // ₹10,00,000

/** The postal part of an address, shared by the delivery and billing addresses. */
const addressFields = {
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  district: z.string().trim().min(1).max(100),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().refine(isIndianState),
  pin: z.string().trim().regex(/^\d{6}$/),
};

const checkoutSchema = z.object({
  items: z
    .array(
      z.object({
        // "<cuid>" for a non-book product, "<cuid>:paperback" /
        // "<cuid>:hardcover" / "<cuid>:ebook" for one edition of a book.
        productId: z.string().regex(/^[A-Za-z0-9_-]{1,64}(:(paperback|hardcover|ebook))?$/),
        quantity: z.number().int().min(1).max(100),
      })
    )
    .min(1)
    .max(50),
  /** Who we deliver to, and where. */
  contact: z.object({
    name: z.string().trim().min(1).max(120),
    email: z.string().trim().max(254).email(),
    ...addressFields,
    // A GSTIN is 15 characters: state code, PAN, entity number, Z, checksum.
    gst: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[0-9A-Z]{15}$/)
      .optional()
      .or(z.literal("")),
  }),
  /**
   * Who the invoice is made out to. Always sent in full — when the shopper
   * ticks "same as delivery" the cart sends a copy of `contact` — so the
   * order records exactly what was billed rather than inferring it.
   */
  billing: z.object({
    name: z.string().trim().min(1).max(120),
    ...addressFields,
  }),
  couponCode: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9-]{2,24}$/)
    .optional(),
});

export type CheckoutInput = z.input<typeof checkoutSchema>;

export type CheckoutError =
  | "SIGN_IN_REQUIRED"
  | "NOT_CONFIGURED"
  | "EMPTY_CART"
  | "INVALID_INPUT"
  | "INVALID_ADDRESS"
  | "PRODUCT_MISSING"
  | "UNAVAILABLE"
  | "COD_UNAVAILABLE"
  | "COUPON_INVALID"
  | "RATE_LIMITED"
  | "GATEWAY_ERROR";

type StartResult =
  | {
      ok: true;
      orderId: string;
      razorpayOrderId: string;
      amountCents: number;
      keyId: string;
      currency: string;
      redirect: string;
    }
  | { ok: false; error: CheckoutError };

type PlaceResult = { ok: true; orderId: string; redirect: string } | { ok: false; error: CheckoutError };

type ProductWithEditions = Product & { editions: BookEdition[] };

/** Why a line can't be bought, or null when it can. */
function ineligibility(product: ProductWithEditions, format: BookFormat | null, quantity: number): string | null {
  if (!product.isPublished) return "unpublished";
  const isBook = product.editions.length > 0;
  // A book is only ever bought one edition at a time, and only in a format
  // it's actually sold in; anything else is bought as itself.
  if (isBook && !format) return "no edition named";
  if (!isBook && format) return "not a book";
  if (!isBook && product.type === "EBOOK") return "e-book with no edition";
  const edition = format ? product.editions.find((candidate) => candidate.format === format) : undefined;
  if (format && !edition) return `not sold as ${format}`;

  const shipsPhysically = edition ? edition.format !== "EBOOK" : product.type === "PHYSICAL_BOOK";
  if (shipsPhysically) {
    if (product.inventoryStatus === "OUT_OF_STOCK" || product.inventoryStatus === "COMING_SOON") {
      return `inventory status ${product.inventoryStatus}`;
    }
    const stockQty = edition ? edition.stockQty : product.stockQty;
    if (stockQty !== null && stockQty < quantity) return "insufficient stock";
  }
  return null;
}

type PreparedOrder = {
  orderItems: {
    productId: string;
    bookFormat: BookFormat | null;
    quantity: number;
    unitPriceCents: number;
    fulfillmentType: FulfillmentType;
    taxType: TaxableType;
    includesEbook: boolean;
  }[];
  /** The shipped lines whose stock is counted — what placing the order takes off the shelf. */
  stockLines: StockLine[];
  subtotalCents: number;
  discountCents: number;
  /** The code that took `discountCents` off, or null when none did. */
  discount: { id: string; code: string } | null;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
  shippingAddress: OrderShippingAddress;
  billingAddress: OrderBillingAddress;
  gstNumber: string | null;
};

/**
 * Validates the cart and delivery details and prices every line from the
 * database. Writes nothing — each caller creates the Order the way its
 * payment method needs.
 */
async function prepareOrder(
  userId: string,
  input: CheckoutInput
): Promise<{ ok: true; order: PreparedOrder } | { ok: false; error: CheckoutError }> {
  if (!input?.items?.length) return { ok: false, error: "EMPTY_CART" };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) {
    const addressProblem = parsed.error.issues.some(
      (issue) => issue.path[0] === "contact" || issue.path[0] === "billing"
    );
    return { ok: false, error: addressProblem ? "INVALID_ADDRESS" : "INVALID_INPUT" };
  }
  const { items, contact, billing, couponCode } = parsed.data;

  const lines = items.map((item) => ({ ...parseLineId(item.productId), quantity: item.quantity }));
  // Two lines for the same edition would each pass the stock check alone.
  if (new Set(lines.map((line) => `${line.productId}:${line.format}`)).size !== lines.length) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  // An e-book is one licence per reader: one copy per line, and never sold
  // to someone who already holds it (the book page disables it too).
  const ebookLines = lines.filter((line) => line.format === "EBOOK");
  if (ebookLines.some((line) => line.quantity !== 1)) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  // Independent reads, run together rather than in turn: each one is a
  // round trip to the database pooler (~0.5s from here), and in sequence
  // they were most of the wait after "Place order". Their results are still
  // checked in the order below.
  const [products, alreadyOwnsEbook, pricing, resolved] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: [...new Set(lines.map((line) => line.productId))] } },
      include: { editions: true },
    }),
    ownsEbook(userId, ebookLines.map((line) => line.productId)),
    getPricingConfig(),
    couponCode ? resolveDiscount(couponCode, userId) : Promise.resolve(null),
  ]);
  const byId = new Map(products.map((product) => [product.id, product]));
  if (lines.some((line) => !byId.has(line.productId))) return { ok: false, error: "PRODUCT_MISSING" };

  for (const line of lines) {
    const reason = ineligibility(byId.get(line.productId)!, line.format, line.quantity);
    if (reason) {
      securityEvent("checkout.rejected_item", { userId, productId: line.productId, edition: line.format, reason });
      return { ok: false, error: reason === "unpublished" ? "PRODUCT_MISSING" : "UNAVAILABLE" };
    }
  }

  if (alreadyOwnsEbook) {
    securityEvent("checkout.rejected_item", { userId, reason: "e-book already owned" });
    return { ok: false, error: "UNAVAILABLE" };
  }

  const orderItems = lines.map((line) => {
    const product = byId.get(line.productId)!;
    const edition = line.format ? product.editions.find((candidate) => candidate.format === line.format)! : undefined;
    const tier = tierForQuantity(pricing.classSetTiers, line.quantity);

    let unitPriceCents: number;
    let fulfillmentType: FulfillmentType;
    let taxType: TaxableType;
    let includesEbook: boolean;

    if (edition?.format === "EBOOK") {
      unitPriceCents = edition.priceCents;
      fulfillmentType = "DIGITAL";
      taxType = "EBOOK";
      includesEbook = true;
    } else if (edition) {
      // Paperback or hardcover: a printed copy, class-set tiers apply.
      unitPriceCents = tierUnitCents(edition.priceCents, tier.discount);
      fulfillmentType = "SHIP";
      taxType = "PHYSICAL_BOOK";
      includesEbook = false;
    } else if (product.type === "SERVICE_PACKAGE") {
      unitPriceCents = product.priceCents;
      fulfillmentType = "SERVICE";
      taxType = "SERVICE_PACKAGE";
      includesEbook = false;
    } else {
      // A non-book shipped product (chart, worksheet, teaching aid).
      unitPriceCents = tierUnitCents(product.priceCents, tier.discount);
      fulfillmentType = "SHIP";
      taxType = "PHYSICAL_BOOK";
      includesEbook = false;
    }

    return {
      productId: line.productId,
      bookFormat: line.format,
      quantity: line.quantity,
      unitPriceCents,
      fulfillmentType,
      taxType,
      includesEbook,
    };
  });

  // Untracked (null) stock is left out so an order of uncounted items costs
  // no extra round trips; `takeStock` re-checks the counted ones atomically.
  const stockLines: StockLine[] = orderItems
    .filter((line) => {
      if (line.fulfillmentType !== "SHIP") return false;
      const product = byId.get(line.productId)!;
      const edition = line.bookFormat ? product.editions.find((candidate) => candidate.format === line.bookFormat) : undefined;
      return (edition ? edition.stockQty : product.stockQty) !== null;
    })
    .map(({ productId, bookFormat, quantity }) => ({ productId, bookFormat, quantity }));

  const subtotalCents = orderItems.reduce((sum, line) => sum + line.unitPriceCents * line.quantity, 0);

  // Every rule — on/off, dates, total and per-customer uses — is checked
  // again here, against the subtotal the database just priced; the cart's
  // earlier `checkCoupon` was only for display. A code that has stopped
  // working since is an error rather than a silent full-price charge, so the
  // shopper never pays more than the total they were shown. Below its
  // minimum order a code is valid but takes nothing off — the cart shows the
  // same — so it's simply not recorded.
  let discountCents = 0;
  let discount: PreparedOrder["discount"] = null;
  if (resolved) {
    if (!resolved.ok) return { ok: false, error: "COUPON_INVALID" };
    discountCents = discountAmountCents(resolved.terms, subtotalCents);
    if (discountCents > 0) discount = { id: resolved.row.id, code: resolved.row.code };
  }
  // Delivery speed is no longer offered at checkout: every order ships
  // standard, and the free-delivery threshold is judged before the discount.
  const shippingCents = deliveryFeeCents(pricing, subtotalCents, "standard");
  const taxCents = gstAfterDiscountCents(
    orderItems.reduce(
      (sum, line) => sum + includedGstCents(line.unitPriceCents * line.quantity, line.taxType, pricing.gstRates),
      0
    ),
    subtotalCents,
    discountCents
  );
  const totalCents = subtotalCents - discountCents + shippingCents;

  if (!Number.isSafeInteger(totalCents) || totalCents < MIN_ORDER_CENTS || totalCents > MAX_ORDER_CENTS) {
    return { ok: false, error: "INVALID_INPUT" };
  }

  return {
    ok: true,
    order: {
      orderItems,
      stockLines,
      subtotalCents,
      discountCents,
      discount,
      taxCents,
      shippingCents,
      totalCents,
      shippingAddress: {
        name: contact.name,
        email: contact.email,
        line1: contact.line1,
        line2: contact.line2 || null,
        district: contact.district,
        city: contact.city,
        state: contact.state,
        postalCode: contact.pin,
        country: "IN",
      },
      billingAddress: {
        name: billing.name,
        // The invoice goes to the same inbox as the order confirmation.
        email: contact.email,
        line1: billing.line1,
        line2: billing.line2 || null,
        district: billing.district,
        city: billing.city,
        state: billing.state,
        postalCode: billing.pin,
        country: "IN",
      },
      gstNumber: contact.gst || null,
    },
  };
}

function orderData(userId: string, prepared: PreparedOrder) {
  return {
    // A relation connect rather than a bare `userId`: Prisma won't take a
    // scalar foreign key alongside a nested write (the COD `payment.create`).
    user: { connect: { id: userId } },
    subtotalCents: prepared.subtotalCents,
    taxCents: prepared.taxCents,
    shippingCents: prepared.shippingCents,
    discountCents: prepared.discountCents,
    totalCents: prepared.totalCents,
    // Connected (not `discountCodeId`) for the same reason as `user`; the
    // code's text is copied too so the order still names it if it's deleted.
    ...(prepared.discount && {
      discountCodeRef: { connect: { id: prepared.discount.id } },
      discountCode: prepared.discount.code,
    }),
    shippingAddress: { ...prepared.shippingAddress },
    billingAddress: { ...prepared.billingAddress },
    gstNumber: prepared.gstNumber,
    items: {
      create: prepared.orderItems.map(({ taxType: _taxType, ...line }) => line),
    },
  };
}

/**
 * Creates the order and takes its counted stock off the shelf together, so
 * an order never exists without its copies having been deducted. Returns
 * null when a line sold out in the moments since `prepareOrder` checked it —
 * someone else's order took the last copies — and nothing is written.
 */
async function createOrderTakingStock<T>(
  userId: string,
  prepared: PreparedOrder,
  create: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T | null> {
  // Nothing counted in the cart: no transaction, no extra round trips.
  if (!prepared.stockLines.length) return create(prisma);
  try {
    const created = await prisma.$transaction(
      async (tx) => {
        await takeStock(tx, prepared.stockLines);
        return create(tx);
      },
      // Each statement is a round trip to the pooler (~0.5s from here), one
      // per counted line plus the order itself — well past the 5s default
      // for a large cart.
      { maxWait: 10_000, timeout: 30_000 }
    );
    expireCachedStock(prepared.stockLines);
    return created;
  } catch (error) {
    if (!(error instanceof OutOfStockError)) throw error;
    securityEvent("checkout.rejected_item", {
      userId,
      productId: error.line.productId,
      edition: error.line.bookFormat,
      reason: "sold out while ordering",
    });
    return null;
  }
}

/**
 * Cash on delivery. The order is confirmed at once — there's no payment to
 * wait for — so it goes straight to PROCESSING and the confirmation email
 * is queued here rather than by `settleOrderPayment`.
 */
export async function placeCodOrder(input: CheckoutInput): Promise<PlaceResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  if (!(await rateLimit(RATE_LIMITS.checkoutStart, user.id)).ok) return { ok: false, error: "RATE_LIMITED" };

  const prepared = await prepareOrder(user.id, input);
  if (!prepared.ok) return prepared;

  // PROCESSING is an entitling status (lib/library.ts), so an e-book line
  // here would unlock its PDF before a rupee changed hands, and a service
  // would start work the same way. Only printed goods are paid on delivery.
  if (prepared.order.orderItems.some((line) => line.fulfillmentType !== "SHIP" || line.includesEbook)) {
    return { ok: false, error: "COD_UNAVAILABLE" };
  }

  const order = await createOrderTakingStock(user.id, prepared.order, (tx) =>
    tx.order.create({
      data: {
        ...orderData(user.id, prepared.order),
        status: "PROCESSING",
        payment: {
          create: {
            amountCents: prepared.order.totalCents,
            currency: "INR",
            status: "CREATED",
            method: "COD",
          },
        },
      },
      select: { id: true },
    })
  );
  if (!order) return { ok: false, error: "UNAVAILABLE" };

  // Queued after the response is sent, so the shopper isn't kept waiting on
  // a product lookup and the Inngest round trip — with no event key that's
  // five retried 401s, ~6s. The order stands whether or not the email goes
  // out; a queue hiccup mustn't make the shopper think it failed and order
  // twice.
  const userEmail = user.email || prepared.order.shippingAddress.email;
  after(async () => {
    try {
      const placed = await prisma.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { items: { include: { product: true } } },
      });
      await inngest.send({
        name: "order/confirmed",
        data: {
          orderId: placed.id,
          userEmail,
          totalCents: placed.totalCents,
          items: placed.items.map((item) => ({
            title: item.bookFormat ? `${item.product.title} (${bookFormatLabel(item.bookFormat)})` : item.product.title,
            quantity: item.quantity,
            priceCents: item.unitPriceCents,
          })),
        },
      });
    } catch (error) {
      console.error("[checkout] could not queue the COD confirmation email", error);
    }
  });

  return { ok: true, orderId: order.id, redirect: `/account/orders?placed=${order.id}` };
}

/** Online payment (UPI / net banking / cards) through Razorpay Checkout. */
export async function startCheckout(input: CheckoutInput): Promise<StartResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  if (!(await rateLimit(RATE_LIMITS.checkoutStart, user.id)).ok) return { ok: false, error: "RATE_LIMITED" };

  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || !process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
    return { ok: false, error: "NOT_CONFIGURED" };
  }

  const prepared = await prepareOrder(user.id, input);
  if (!prepared.ok) return prepared;
  const { totalCents } = prepared.order;

  // Stock is held from here, while the shopper pays, so the copies they're
  // paying for can't sell to someone else in the meantime.
  const order = await createOrderTakingStock(user.id, prepared.order, (tx) =>
    tx.order.create({
      data: { ...orderData(user.id, prepared.order), status: "PENDING" },
      include: { items: true },
    })
  );
  if (!order) return { ok: false, error: "UNAVAILABLE" };

  let razorpayOrderId: string;
  try {
    const rp = await createRazorpayOrder({ amountCents: totalCents, receipt: order.id });
    razorpayOrderId = rp.id;
    // The amount we charge is the amount we computed — never whatever the
    // gateway echoes back.
    if (typeof rp.amount === "number" && rp.amount !== totalCents) throw new Error("Gateway amount mismatch");
  } catch (error) {
    console.error("[checkout] createRazorpayOrder failed", error);
    // Conditional, so the held copies go back exactly once.
    const { stockLines } = prepared.order;
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({ where: { id: order.id, status: "PENDING" }, data: { status: "CANCELLED" } });
      if (count === 1) await returnStock(tx, stockLines);
    });
    expireCachedStock(stockLines);
    return { ok: false, error: "GATEWAY_ERROR" };
  }

  await prisma.payment.create({
    data: {
      orderId: order.id,
      gatewayOrderId: razorpayOrderId,
      amountCents: totalCents,
      currency: "INR",
      status: "CREATED",
    },
  });

  const hasDigital = order.items.some((item) => item.includesEbook);

  return {
    ok: true,
    orderId: order.id,
    razorpayOrderId,
    amountCents: totalCents,
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    currency: "INR",
    redirect: hasDigital ? "/account/library" : "/account/orders",
  };
}

const confirmSchema = z.object({
  orderId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  razorpayOrderId: z.string().regex(/^order_[A-Za-z0-9]{1,40}$/),
  razorpayPaymentId: z.string().regex(/^pay_[A-Za-z0-9]{1,40}$/),
  razorpaySignature: z.string().regex(/^[0-9a-f]{64}$/i),
});

type ConfirmInput = z.input<typeof confirmSchema>;

type ConfirmResult = { ok: true; redirect: string } | { ok: false; error: string };

export async function confirmCheckout(input: ConfirmInput): Promise<ConfirmResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  if (!(await rateLimit(RATE_LIMITS.checkoutConfirm, user.id)).ok) return { ok: false, error: "RATE_LIMITED" };

  const parsed = confirmSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "BAD_SIGNATURE" };
  const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

  if (!verifyPaymentSignature({ orderId: razorpayOrderId, paymentId: razorpayPaymentId, signature: razorpaySignature })) {
    securityEvent("checkout.bad_signature", { userId: user.id, orderId });
    return { ok: false, error: "BAD_SIGNATURE" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payment: true },
  });
  if (!order || order.userId !== user.id || !order.payment) return { ok: false, error: "NOT_FOUND" };

  // The signature proves *a* payment happened for `razorpayOrderId`. It only
  // confirms THIS order if that's the gateway order we created for it —
  // otherwise one cheap receipt could be replayed against any number of
  // expensive orders.
  if (order.payment.gatewayOrderId !== razorpayOrderId) {
    securityEvent("checkout.payment_mismatch", {
      userId: user.id,
      orderId,
      reason: "gateway order id does not belong to this order",
    });
    return { ok: false, error: "NOT_FOUND" };
  }

  const redirect = order.items.some((item) => item.includesEbook) ? "/account/library" : "/account/orders";
  if (order.status === "PAID") return { ok: true, redirect };

  // Ask Razorpay what was actually charged, against which order. Anything
  // short of a captured payment for the full amount is left to the webhook.
  let gateway;
  try {
    gateway = await fetchGatewayPayment(razorpayPaymentId);
  } catch (error) {
    console.error("[checkout] could not fetch payment from Razorpay", error);
    return { ok: false, error: "VERIFY_FAILED" };
  }
  if (
    gateway.orderId !== razorpayOrderId ||
    gateway.amount !== order.payment.amountCents ||
    gateway.currency !== order.payment.currency
  ) {
    securityEvent("checkout.payment_mismatch", {
      userId: user.id,
      orderId,
      reason: "gateway payment does not match order",
      gatewayAmount: gateway.amount,
      expectedAmount: order.payment.amountCents,
    });
    return { ok: false, error: "NOT_FOUND" };
  }
  if (gateway.status !== "captured") {
    // Authorized but not yet captured: the webhook will settle it. Send the
    // shopper to their orders, where it shows as pending until then.
    return { ok: true, redirect: "/account/orders" };
  }

  const outcome = await settleOrderPayment({
    paymentRowId: order.payment.id,
    orderId: order.id,
    gatewayPaymentId: razorpayPaymentId,
    gatewaySignature: razorpaySignature,
    source: "checkout",
  });
  if (outcome === "payment_reused" || outcome === "not_pending") return { ok: false, error: "NOT_FOUND" };

  return { ok: true, redirect };
}

type CouponResult =
  | {
      ok: true;
      code: string;
      type: DiscountKind;
      rateBps: number;
      amountOffCents: number;
      maxDiscountCents: number | null;
      minOrderCents: number;
      blurb: string;
    }
  | { ok: false; error: "INVALID" | "EXPIRED" | "USED_UP" | "CUSTOMER_LIMIT" | "RATE_LIMITED" };

/**
 * Validates one discount code on the server, for the cart. The list of
 * live codes is never sent to the browser (it used to ride along in the
 * cart's pricing prop, handing every code to every visitor), and lookups
 * are rate-limited so codes can't be enumerated. A good code comes back
 * with its terms so the cart can show the saving — and keep it right as the
 * shopper changes quantities — but `prepareOrder` re-checks everything when
 * the order is placed.
 *
 * A code that's switched off or hasn't started yet reads as plain INVALID,
 * so typing one reveals nothing; an ended or used-up code says so, because
 * a shopper holding a real code deserves to know why it stopped working.
 */
export async function checkCoupon(rawCode: string): Promise<CouponResult> {
  const user = await getCurrentUser();
  const identity = user?.id ?? clientIp(await headers());
  if (!(await rateLimit(RATE_LIMITS.couponCheck, identity)).ok) return { ok: false, error: "RATE_LIMITED" };

  const resolved = await resolveDiscount(rawCode, user?.id);
  if (!resolved.ok) {
    const { reason } = resolved;
    return { ok: false, error: reason === "EXPIRED" || reason === "USED_UP" || reason === "CUSTOMER_LIMIT" ? reason : "INVALID" };
  }
  return { ok: true, ...resolved.terms, blurb: resolved.row.blurb ?? "" };
}
