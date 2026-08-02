import type { Metadata } from "next";
import { getPricingConfig } from "@repo/database";
import { CartScreen } from "@/components/commerce/cart-screen";

export const metadata: Metadata = { title: "Your cart" };

// FR-3.1–3.5: one cart containing mixed items (books, e-books, services),
// with delivery details and payment on the same screen — the approved
// design merges what used to be two steps.
//
// The cart itself is client-rendered because it lives in a localStorage-backed
// Zustand store with no SSR value; this Server Component exists only to load
// the admin-managed delivery/GST/discount rules and hand them down, so the
// browser bundle never sees Prisma. /checkout redirects here.
export default async function CartPage() {
  const pricing = await getPricingConfig();
  return <CartScreen pricing={pricing} />;
}
