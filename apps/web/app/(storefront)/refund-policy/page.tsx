import type { Metadata } from "next";
import Link from "next/link";
import { ContactLinks, PolicyPage, PolicySection } from "@/components/legal/policy-page";
import { getPolicyDetails } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy",
  description: "How to cancel an order, return a printed item, and when e-books and publishing services can be refunded.",
};

// The return window is admin-editable (Homepage text → Policies) and should
// match the "Easy returns" promise on catalogue pages (homepage.trust.item2).

export default async function RefundPolicyPage() {
  const d = await getPolicyDetails();
  const days = `${d.returnWindowDays} ${d.returnWindowDays === 1 ? "day" : "days"}`;

  return (
    <PolicyPage
      href="/refund-policy"
      title="Refund & Cancellation Policy"
      standfirst={`Printed orders can be returned for a replacement or a full refund within ${days} of delivery.`}
      lastUpdated={d.lastUpdated}
    >
      <PolicySection title="Cancelling an order">
        <ul>
          <li>
            <strong>Printed items</strong> — you can cancel any time before the order is dispatched, for a full refund.
            Once it has been dispatched, use the return process below instead.
          </li>
          <li>
            <strong>E-books</strong> — you can cancel for a full refund as long as the e-book has not been downloaded.
          </li>
          <li>
            <strong>Publishing services</strong> — you can cancel for a full refund before work begins. After that, we
            refund the fee less the work already done, as set out in your package or quote.
          </li>
        </ul>
        <p>
          To cancel, email <ContactLinks email={d.contactEmail} phone={d.contactPhone} /> with your order number.
        </p>
      </PolicySection>

      <PolicySection title="Returning printed items">
        <p>Within {days} of delivery you can return a printed item for a replacement or a full refund of its price.</p>
        <ul>
          <li>
            <strong>Damaged, defective or wrong items</strong> — send us your order number and a photo of the problem.
            We arrange the return at no cost to you and refund or replace the item, including any delivery charge.
          </li>
          <li>
            <strong>Any other reason</strong> — the item must be unused and in the condition you received it. We refund
            the item price; the original delivery charge and the cost of sending it back are not refunded.
          </li>
          <li>
            Bulk and class-set orders, and items printed to your specification, can only be returned if damaged,
            defective or wrong.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="E-books">
        <p>
          Because a downloaded file cannot be returned, e-books are not refundable once downloaded — unless the file
          is faulty and we cannot give you a working copy, in which case we refund it in full. When an e-book is
          refunded, it is removed from your <Link href="/account/library">digital library</Link>.
        </p>
      </PolicySection>

      <PolicySection title="How refunds are paid">
        <ul>
          <li>We confirm by email once a return is received or a cancellation is approved.</li>
          <li>
            Approved refunds are issued within 5–7 working days to the original payment method (UPI, card or bank
            account). Your bank may take a few more days to show it.
          </li>
          <li>Cash on Delivery orders are refunded by bank transfer or UPI to an account you give us.</li>
        </ul>
      </PolicySection>

      <PolicySection title="Need help?">
        <p>
          Contact us at <ContactLinks email={d.contactEmail} phone={d.contactPhone} />, or see our{" "}
          <Link href="/contact">Contact us</Link> page for the Grievance Officer’s details.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
