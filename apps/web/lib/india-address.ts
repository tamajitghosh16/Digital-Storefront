/**
 * Indian postal-address data shared by the account address book, the cart's
 * checkout form and the checkout Server Actions.
 *
 * Lives here rather than in @repo/database because Client Components need
 * the list at runtime, and that package's entry point builds the Prisma
 * client — only its *types* are safe to import from the browser.
 */

/** The 28 states, in the order the address forms list them. */
export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const;

/** The 8 union territories. */
export const INDIAN_UNION_TERRITORIES = [
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
] as const;

export type IndianState = (typeof INDIAN_STATES)[number] | (typeof INDIAN_UNION_TERRITORIES)[number];

const ALL_REGIONS: readonly string[] = [...INDIAN_STATES, ...INDIAN_UNION_TERRITORIES];

/** Whether `value` is exactly one of the 36 states/union territories above. */
export function isIndianState(value: string): value is IndianState {
  return ALL_REGIONS.includes(value);
}

/**
 * The delivery address an order was placed with, as stored in
 * `Order.shippingAddress`. A snapshot, not a reference to `Address`: the
 * saved address can be edited or deleted after the order is placed.
 */
export interface OrderShippingAddress {
  name: string;
  email: string;
  line1: string;
  line2: string | null;
  district: string;
  city: string;
  state: string;
  postalCode: string;
  country: "IN";
}

/**
 * The address the invoice is made out to, as stored in
 * `Order.billingAddress` — the same shape and snapshot rule as the delivery
 * address, so one parser reads both.
 */
export type OrderBillingAddress = OrderShippingAddress;
