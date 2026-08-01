import type { Metadata } from "next";
import { CartScreen } from "@/components/commerce/cart-screen";

export const metadata: Metadata = { title: "Your cart" };

// FR-3.1–3.5: one cart containing mixed items (books, e-books, services),
// with delivery details and payment on the same screen — the approved
// design merges what used to be two steps.
//
// Client-rendered because the cart lives in a localStorage-backed Zustand
// store with no SSR value; /checkout redirects here.
export default function CartPage() {
  return <CartScreen />;
}
