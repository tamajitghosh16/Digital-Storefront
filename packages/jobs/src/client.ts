import { EventSchemas, Inngest } from "inngest";

/**
 * Event catalogue — Technical Design Document, Section 3.8 (Notification System).
 * Every notification-worthy mutation emits one of these instead of calling
 * email/notification code directly, so the fan-out logic lives in one place.
 */
type Events = {
  "order/confirmed": {
    data: { orderId: string; userEmail: string; totalCents: number; items: { title: string; quantity: number; priceCents: number }[] };
  };
  // Sent by apps/admin when staff mark an order shipped. `ordersUrl` is the
  // storefront's My Orders page (where the carrier's tracking link lives),
  // when admin knows the storefront's address.
  "order/shipped": {
    data: { orderId: string; userEmail: string; carrier: string; trackingNumber: string; ordersUrl?: string };
  };
  "project/status_changed": { data: { projectId: string; authorEmail: string; bookTitle: string; status: string } };
  "submission/received": { data: { kind: "self_publishing" | "service_request"; id: string; staffEmails: string[] } };
  "upload/scan_requested": { data: { fileAssetId: string; blobPath: string } };
};

export const inngest = new Inngest({
  id: "digital-storefront",
  schemas: new EventSchemas().fromRecord<Events>(),
});
