// Order history, digital library and publishing projects for the
// signed-in account area.

import type { Order, OrderItem, Royalty, SelfPublishingProject } from "@repo/database";
import { SAMPLE_EBOOKS } from "./books";
import { NOW, type DisplayProduct } from "./shared";

export type SampleOrder = Order & { items: OrderItem[] };

function day(offset: number) {
  const d = new Date(NOW);
  d.setDate(d.getDate() - offset);
  return d;
}

export const SAMPLE_ORDERS: SampleOrder[] = [
  {
    id: "order-10482",
    userId: null,
    guestEmail: null,
    status: "DELIVERED",
    subtotalCents: 249900,
    taxCents: 17493,
    shippingCents: 4990,
    totalCents: 272383,
    shippingAddressId: null,
    billingAddressId: null,
    trackingNumber: "IN482910422",
    carrier: "BlueDart",
    createdAt: day(12),
    updatedAt: day(9),
    items: [
      { id: "item-1", orderId: "order-10482", productId: "book-1-physical", quantity: 1, unitPriceCents: 249900, fulfillmentType: "SHIP" },
    ],
  },
  {
    id: "order-10479",
    userId: null,
    guestEmail: null,
    status: "READY_FOR_DOWNLOAD",
    subtotalCents: 89900,
    taxCents: 6293,
    shippingCents: 0,
    totalCents: 96193,
    shippingAddressId: null,
    billingAddressId: null,
    trackingNumber: null,
    carrier: null,
    createdAt: day(15),
    updatedAt: day(15),
    items: [
      { id: "item-2", orderId: "order-10479", productId: "book-3-ebook", quantity: 1, unitPriceCents: 89900, fulfillmentType: "DIGITAL" },
    ],
  },
  {
    id: "order-10465",
    userId: null,
    guestEmail: null,
    status: "PROCESSING",
    subtotalCents: 1790000,
    taxCents: 125300,
    shippingCents: 0,
    totalCents: 1915300,
    shippingAddressId: null,
    billingAddressId: null,
    trackingNumber: null,
    carrier: null,
    createdAt: day(21),
    updatedAt: day(2),
    items: [
      { id: "item-3", orderId: "order-10465", productId: "service-standard", quantity: 1, unitPriceCents: 1790000, fulfillmentType: "SERVICE" },
    ],
  },
];

export const SAMPLE_LIBRARY_ITEMS: DisplayProduct[] = [SAMPLE_EBOOKS[2], SAMPLE_EBOOKS[4], SAMPLE_EBOOKS[5]].filter(
  (p): p is DisplayProduct => !!p
);

export type SampleProject = SelfPublishingProject & { royalties: Royalty[] };

export const SAMPLE_PUBLISHING_PROJECTS: SampleProject[] = [
  {
    id: "project-1",
    authorId: "sample-author",
    bookTitle: "The Last Lighthouse",
    synopsis: "A keeper's final season on a decommissioned lighthouse.",
    selectedPackage: "Guided",
    addOns: ["Copy Editing"],
    status: "IN_REVIEW",
    targetPriceCents: 89900,
    royaltyRateBps: 7000,
    createdAt: day(3),
    updatedAt: day(1),
    royalties: [],
  },
  {
    id: "project-2",
    authorId: "sample-author",
    bookTitle: "Root & Static",
    synopsis: "In a city where trees broadcast memories.",
    selectedPackage: "Guided",
    addOns: [],
    status: "IN_PRODUCTION",
    targetPriceCents: 114900,
    royaltyRateBps: 7000,
    createdAt: day(18),
    updatedAt: day(10),
    royalties: [
      {
        id: "royalty-1",
        projectId: "project-2",
        salesPeriodStart: day(30),
        salesPeriodEnd: day(1),
        grossSalesCents: 45000,
        royaltyRateBps: 7000,
        amountOwedCents: 31500,
        payoutStatus: "PENDING",
        payoutRef: null,
        createdAt: day(1),
      },
    ],
  },
  {
    id: "project-3",
    authorId: "sample-author",
    bookTitle: "Quiet Hours",
    synopsis: "A collection of poems on solitude, work, and the small hours of the morning.",
    selectedPackage: "Full-Service",
    addOns: ["Print-on-Demand Setup"],
    status: "PUBLISHED",
    targetPriceCents: 69900,
    royaltyRateBps: 7500,
    createdAt: day(60),
    updatedAt: day(28),
    royalties: [
      {
        id: "royalty-2",
        projectId: "project-3",
        salesPeriodStart: day(60),
        salesPeriodEnd: day(30),
        grossSalesCents: 128000,
        royaltyRateBps: 7500,
        amountOwedCents: 41260,
        payoutStatus: "PAID",
        payoutRef: "payout_sample_1",
        createdAt: day(30),
      },
    ],
  },
] as SampleProject[];
