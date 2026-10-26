import type { Metadata } from "next";
import { getCurrentUser } from "@repo/auth/server";
import { getPricingConfig } from "@repo/database";
import { CartScreen } from "@/components/commerce/cart-screen";
import { getAddresses } from "@/lib/actions/addresses";

export const metadata: Metadata = { title: "Your cart" };

// FR-3.1–3.5: one cart containing mixed items (books, e-books, services),
// with the delivery details ("Checkout") under the lines. Choosing how to
// pay happens on the next step, /payment.
//
// The cart itself is client-rendered because it lives in a localStorage-backed
// Zustand store with no SSR value; this Server Component exists only to load
// the admin-managed delivery/GST/discount rules, tell the cart whether the
// shopper is signed in (checkout requires it), and pre-fill the form from
// their account and saved addresses. /checkout redirects here.
export default async function CartPage() {
  const [pricing, user, addresses] = await Promise.all([getPricingConfig(), getCurrentUser(), getAddresses()]);
  return (
    <CartScreen
      pricing={pricing}
      isSignedIn={Boolean(user)}
      account={{ name: user?.name?.trim() ?? "", email: user?.email ?? "" }}
      initialAddresses={addresses}
    />
  );
}
