import { inngest } from "../client";
import { sendOrderShipped } from "@repo/email";

export const onOrderShipped = inngest.createFunction(
  { id: "order-shipped-email" },
  { event: "order/shipped" },
  async ({ event }) => {
    await sendOrderShipped({
      to: event.data.userEmail,
      // The same short "#ab12c" reference the storefront's My Orders page shows.
      orderRef: `#${event.data.orderId.slice(-5)}`,
      carrier: event.data.carrier,
      trackingNumber: event.data.trackingNumber,
      ordersUrl: event.data.ordersUrl,
    });
  }
);
