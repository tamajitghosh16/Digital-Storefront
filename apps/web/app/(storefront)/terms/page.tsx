import type { Metadata } from "next";
import Link from "next/link";
import { ContactLinks, PolicyPage, PolicySection } from "@/components/legal/policy-page";
import { getPolicyDetails } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that apply when you use this website or buy books, e-books and publishing services from us.",
};

export default async function TermsPage() {
  const d = await getPolicyDetails();

  return (
    <PolicyPage
      href="/terms"
      title="Terms & Conditions"
      standfirst="The agreement between you and us when you use this website or buy from it."
      lastUpdated={d.lastUpdated}
    >
      <PolicySection title="About these terms">
        <p>
          This website is operated by <strong>{d.legalName}</strong>
          {d.address ? `, ${d.address}` : ""}
          {d.gstin ? ` (GSTIN ${d.gstin})` : ""}. By using the site or placing an order you agree to these terms, our{" "}
          <Link href="/privacy-policy">Privacy Policy</Link>, our{" "}
          <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link> and our{" "}
          <Link href="/shipping-policy">Shipping &amp; Delivery Policy</Link>.
        </p>
      </PolicySection>

      <PolicySection title="Your account">
        <p>
          You must be 18 or over to create an account. Keep your password private; you are responsible for orders
          placed from your account. Tell us at once if you think someone else has used it. We may suspend an account
          used for fraud, abuse or in breach of these terms.
        </p>
      </PolicySection>

      <PolicySection title="Products, prices and orders">
        <ul>
          <li>All prices are in Indian Rupees. Applicable GST and delivery charges are shown before you pay.</li>
          <li>
            We try to describe every product accurately. Colours and covers may differ slightly from what you see on
            screen.
          </li>
          <li>
            Placing an order is an offer to buy. The contract is formed when we confirm the order by email. We may
            decline or cancel an order — for example if an item is out of stock or the price shown was clearly wrong —
            and if we do, we refund anything you have paid in full.
          </li>
          <li>Discount codes are subject to the conditions shown with them and cannot be exchanged for cash.</li>
        </ul>
      </PolicySection>

      <PolicySection title="Payment">
        <p>
          Online payments (UPI, cards, net banking) are processed securely by Razorpay. Cash on Delivery is available
          for orders containing only printed items; e-books and services must be paid for online. An order is only
          treated as paid once the payment is confirmed to us by Razorpay.
        </p>
      </PolicySection>

      <PolicySection title="E-books">
        <p>
          When you buy an e-book you get a personal, non-exclusive, non-transferable licence to download and read it
          for your own use. You do not buy the copyright. Each e-book can be downloaded a limited number of times from{" "}
          <Link href="/account/library">your digital library</Link>. You may not copy, share, resell or publicly
          distribute it. Access ends if the order is refunded or cancelled.
        </p>
      </PolicySection>

      <PolicySection title="Publishing services">
        <p>
          Self-publishing, bulk publishing and e-book creation services are provided on the scope, price and timeline
          set out in the package or written quote you accept. You confirm that you own, or have permission to use,
          everything you send us, and that it does not infringe anyone’s rights or break any law. You keep the
          copyright in your work. We may refuse material we consider unlawful or harmful.
        </p>
      </PolicySection>

      <PolicySection title="Intellectual property">
        <p>
          The website, its design, text, images and our own publications belong to us or our licensors. You may not
          copy or reuse them without written permission, except as the law allows.
        </p>
      </PolicySection>

      <PolicySection title="Acceptable use">
        <p>
          Do not misuse the site: no attempts to break its security, scrape it at scale, interfere with other users,
          upload malware, or use it for anything unlawful.
        </p>
      </PolicySection>

      <PolicySection title="Our liability">
        <p>
          Nothing in these terms limits your rights under the Consumer Protection Act, 2019. Beyond those rights, our
          total liability for any order is limited to the amount you paid for it, and we are not liable for indirect or
          consequential loss, or for delays caused by events outside our reasonable control.
        </p>
      </PolicySection>

      <PolicySection title="Law and disputes">
        <p>
          These terms are governed by the laws of India. Please contact us first — most problems can be sorted out
          quickly. Any dispute we cannot resolve together is subject to the jurisdiction of {d.courts}, without
          affecting your right to approach a consumer commission.
        </p>
      </PolicySection>

      <PolicySection title="Grievances and contact">
        <p>
          {d.grievanceName ? <strong>{d.grievanceName}</strong> : "Our Grievance Officer"} handles complaints at{" "}
          <ContactLinks email={d.grievanceEmail} />. We acknowledge complaints within 48 hours and aim to resolve them
          within one month. Full details are on our <Link href="/contact">Contact us</Link> page.
        </p>
      </PolicySection>

      <PolicySection title="Changes">
        <p>
          We may update these terms. The version on this page when you place an order is the one that applies to that
          order.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
