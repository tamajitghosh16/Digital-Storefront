import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@repo/auth/server";
import { getPricingConfig } from "@repo/database";
import { PaymentScreen } from "@/components/commerce/payment-screen";

export const metadata: Metadata = { title: "Payment" };

// The step after the cart's Checkout section: pick a payment method and
// place the order. Like the cart, the screen is client-rendered (cart and
// delivery details live in browser storage); this Server Component gates
// it on sign-in, loads the pricing rules for the summary, and says whether
// Razorpay is configured — until it is, only Cash on Delivery is offered.
export default async function PaymentPage() {
  const [user, pricing] = await Promise.all([getCurrentUser(), getPricingConfig()]);
  if (!user) redirect("/sign-in?next=/payment");

  return (
    <PaymentScreen
      pricing={pricing}
      paymentsConfigured={Boolean(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID)}
    />
  );
}
