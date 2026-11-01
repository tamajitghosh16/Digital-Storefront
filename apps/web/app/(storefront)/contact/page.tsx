import type { Metadata } from "next";
import Link from "next/link";
import { ContactLinks, PolicyPage, PolicySection } from "@/components/legal/policy-page";
import { getPolicyDetails } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "How to reach us about an order, a publishing project, or a complaint.",
};

// The Consumer Protection (E-Commerce) Rules 2020 require the seller's legal
// name, address, customer-care contact and a named Grievance Officer to be
// shown on the site. Every value comes from Site Settings or the "Policies
// and contact page" content group in the admin.

export default async function ContactPage() {
  const d = await getPolicyDetails();

  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Business name", value: d.legalName },
    ...(d.address ? [{ label: "Registered address", value: d.address }] : []),
    ...(d.contactEmail ? [{ label: "Email", value: <ContactLinks email={d.contactEmail} /> }] : []),
    ...(d.contactPhone ? [{ label: "Phone", value: <ContactLinks email={null} phone={d.contactPhone} /> }] : []),
    { label: "Support hours", value: d.supportHours },
    ...(d.gstin ? [{ label: "GSTIN", value: d.gstin }] : []),
  ];

  return (
    <PolicyPage
      href="/contact"
      title="Contact Us"
      standfirst="Questions about an order, a book or a publishing project? We’re happy to help."
    >
      <PolicySection title="Get in touch">
        <dl className="grid gap-x-6 gap-y-3 rounded-tile bg-tile p-5 sm:grid-cols-[160px_1fr]">
          {facts.map((fact) => (
            <div key={fact.label} className="contents">
              <dt className="caps pt-0.5 text-ink-muted">{fact.label}</dt>
              <dd className="mb-2 text-ink sm:mb-0">{fact.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4">
          Please include your order number if your message is about an order — you’ll find it under{" "}
          <Link href="/account/orders">My orders</Link> and in your confirmation email.
        </p>
      </PolicySection>

      <PolicySection title="Grievance Officer">
        <p>
          If we haven’t resolved a problem to your satisfaction, or you have a complaint about how we handle your
          personal data, contact our Grievance Officer
          {d.grievanceName ? (
            <>
              , <strong>{d.grievanceName}</strong>,
            </>
          ) : null}{" "}
          at <ContactLinks email={d.grievanceEmail} />. We acknowledge every complaint within 48 hours and aim to
          resolve it within one month.
        </p>
      </PolicySection>

      <PolicySection title="Quick links">
        <ul>
          <li>
            <Link href="/account/orders">Track an order</Link>
          </li>
          <li>
            <Link href="/account/library">Download your e-books</Link>
          </li>
          <li>
            <Link href="/refund-policy">Returns and refunds</Link>
          </li>
          <li>
            <Link href="/shipping-policy">Delivery times and charges</Link>
          </li>
        </ul>
      </PolicySection>
    </PolicyPage>
  );
}
