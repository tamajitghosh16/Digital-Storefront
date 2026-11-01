import type { Metadata } from "next";
import Link from "next/link";
import { ContactLinks, PolicyPage, PolicySection } from "@/components/legal/policy-page";
import { getPolicyDetails } from "@/lib/policies";
import { formatINRWhole } from "@/lib/format";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy",
  description: "Where we deliver, how long it takes, what it costs, and how e-books and services are delivered.",
};

// Threshold, fee and delivery time come from Pricing & delivery in the admin
// (the same numbers the cart charges), so this page can't drift from checkout.

export default async function ShippingPolicyPage() {
  const d = await getPolicyDetails();
  const freeOver = formatINRWhole(d.freeDeliveryOverCents);

  return (
    <PolicyPage
      href="/shipping-policy"
      title="Shipping & Delivery Policy"
      standfirst={`We deliver printed orders anywhere in India — free on orders over ${freeOver}.`}
      lastUpdated={d.lastUpdated}
    >
      <PolicySection title="Where we deliver">
        <p>
          We currently ship printed items to addresses in all states and union territories of India. We do not ship
          internationally yet. E-books can be bought and downloaded from anywhere.
        </p>
      </PolicySection>

      <PolicySection title="Delivery charges">
        <ul>
          <li>Orders over {freeOver} are delivered free.</li>
          <li>
            Below that, a delivery charge of {formatINRWhole(d.deliveryFeeCents)} applies. It is always shown in your
            cart before you pay.
          </li>
          <li>E-books and digital services have no delivery charge.</li>
        </ul>
      </PolicySection>

      <PolicySection title="How long it takes">
        <ul>
          <li>Orders are dispatched within {d.dispatchTime} of being confirmed.</li>
          <li>After dispatch, delivery usually takes {d.standardEta.replace(/^in /, "")}. Remote areas can take longer.</li>
          <li>Large bulk and class-set orders may take longer to prepare; we will tell you the date when you order.</li>
        </ul>
        <p>
          You can follow every order under <Link href="/account/orders">My orders</Link>, and we email you when it
          ships.
        </p>
      </PolicySection>

      <PolicySection title="Cash on Delivery">
        <p>
          Cash on Delivery is available for orders containing only printed items. Please have the exact amount ready.
          Orders that include an e-book or a service must be paid online.
        </p>
      </PolicySection>

      <PolicySection title="E-books and services">
        <p>
          E-books appear in your <Link href="/account/library">digital library</Link> as soon as your payment is
          confirmed — usually within a minute. Publishing and e-book creation services are delivered digitally on the
          timeline in your package or quote.
        </p>
      </PolicySection>

      <PolicySection title="Problems with a delivery">
        <ul>
          <li>
            If a parcel arrives visibly damaged, you may refuse it, or accept it and tell us within{" "}
            {d.returnWindowDays} days with a photo — see our <Link href="/refund-policy">Refund &amp; Cancellation
            Policy</Link>.
          </li>
          <li>
            Please check your address carefully. If a parcel comes back to us because the address was wrong or nobody
            was available after repeated attempts, we can re-send it for a further delivery charge or refund the order
            less the delivery cost.
          </li>
          <li>
            If your order has not arrived within the expected time, contact{" "}
            <ContactLinks email={d.contactEmail} phone={d.contactPhone} /> and we will trace it with the courier.
          </li>
        </ul>
      </PolicySection>
    </PolicyPage>
  );
}
