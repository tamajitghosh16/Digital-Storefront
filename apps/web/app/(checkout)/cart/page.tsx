import type { Metadata } from "next";
import { getCurrentUser } from "@repo/auth/server";
import { getPricingConfig } from "@repo/database";
import { CartScreen } from "@/components/commerce/cart-screen";
import { getAddresses } from "@/lib/actions/addresses";

export const metadata: Metadata = { title: "Your cart" };

// FR-3.1–3.5: one cart containing mixed items (books, e-books, services),
// with delivery details and payment on the same screen — the approved
// design merges what used to be two steps.
//
// The cart itself is client-rendered because it lives in a localStorage-backed
// Zustand store with no SSR value; this Server Component exists only to load
// the admin-managed delivery/GST/discount rules, tell the cart whether the
// shopper is signed in (payment requires it), and whether Razorpay is
// configured. /checkout redirects here.
export default async function CartPage() {
  const [pricing, user, addresses] = await Promise.all([getPricingConfig(), getCurrentUser(), getAddresses()]);
  return (
    <CartScreen
      pricing={pricing}
      isSignedIn={Boolean(user)}
      paymentsConfigured={Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)}
      initialAddresses={addresses}
    />
  );
}
