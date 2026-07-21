import { inngest } from "../client";
import { sendOrderConfirmation } from "@repo/email";

export const onOrderConfirmed = inngest.createFunction(
  { id: "order-confirmed-email" },
  { event: "order/confirmed" },
  async ({ event }) => {
    await sendOrderConfirmation({
      to: event.data.userEmail,
      orderId: event.data.orderId,
      items: event.data.items,
      totalCents: event.data.totalCents,
    });
  }
);
