import type { Metadata } from "next";
import Link from "next/link";
import { ContactLinks, PolicyPage, PolicySection } from "@/components/legal/policy-page";
import { getPolicyDetails } from "@/lib/policies";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What personal data we collect, why, who we share it with, and your rights under India's DPDP Act.",
};

// Written against what the code actually stores and which processors it
// calls (Supabase, Vercel, Razorpay, Resend, Upstash). Update this
// page whenever a new processor or a new kind of personal data is added.

export default async function PrivacyPolicyPage() {
  const d = await getPolicyDetails();

  return (
    <PolicyPage
      href="/privacy-policy"
      title="Privacy Policy"
      standfirst={`How ${d.siteName} collects, uses and protects your personal data.`}
      lastUpdated={d.lastUpdated}
    >
      <PolicySection title="Who we are">
        <p>
          This website is operated by <strong>{d.legalName}</strong>
          {d.address ? `, ${d.address}` : ""} (“we”, “us”). We are the data fiduciary for the personal data
          described here, under the Digital Personal Data Protection Act, 2023 (“DPDP Act”).
        </p>
      </PolicySection>

      <PolicySection title="What we collect">
        <ul>
          <li>
            <strong>Account details</strong> — your name, email address and password when you sign up. Passwords are
            stored only as a secure hash by our authentication provider; we never see them.
          </li>
          <li>
            <strong>Order details</strong> — delivery and billing addresses, phone number, the items you buy, and a
            GSTIN if you choose to give one for a business invoice.
          </li>
          <li>
            <strong>Payment details</strong> — payments are processed by Razorpay. We receive a payment reference and
            status, but never your full card number, UPI PIN or net-banking password.
          </li>
          <li>
            <strong>Digital library activity</strong> — when and how often you download an e-book you bought, so we
            can apply the download allowance.
          </li>
          <li>
            <strong>Publishing projects</strong> — manuscripts, cover files and project details you send us for
            self-publishing or e-book creation services.
          </li>
          <li>
            <strong>Technical data</strong> — IP address, browser type and request logs, used to keep the site secure,
            limit abusive traffic and investigate errors.
          </li>
        </ul>
      </PolicySection>

      <PolicySection title="Why we use it">
        <p>We process your personal data, with your consent or for these legitimate uses, to:</p>
        <ul>
          <li>create and secure your account;</li>
          <li>take payment for, deliver and support your orders, including returns and refunds;</li>
          <li>give you access to e-books you have bought;</li>
          <li>carry out publishing services you have asked for;</li>
          <li>send order confirmations, delivery updates and account emails;</li>
          <li>prevent fraud and abuse and keep the site secure;</li>
          <li>meet our obligations under tax, accounting and other Indian laws.</li>
        </ul>
        <p>We do not sell your personal data, and we do not use it for advertising profiles.</p>
      </PolicySection>

      <PolicySection title="Who we share it with">
        <p>Only with service providers who process it on our behalf, under contract, for the purposes above:</p>
        <ul>
          <li>Supabase — database and sign-in;</li>
          <li>Vercel — website hosting;</li>
          <li>Razorpay — payment processing;</li>
          <li>Resend — transactional email;</li>
          <li>Upstash — rate limiting;</li>
          <li>courier partners — your name, address and phone number, to deliver printed orders.</li>
        </ul>
        <p>
          Some of these providers may store data on servers outside India. We may also disclose data where the law
          requires it, for example to tax authorities or under a court order.
        </p>
      </PolicySection>

      <PolicySection title="Cookies and local storage">
        <p>
          We use strictly necessary cookies to keep you signed in. Your cart, wishlist and light/dark theme choice are
          kept in your browser’s local storage, on your own device. We do not use advertising or third-party tracking
          cookies.
        </p>
      </PolicySection>

      <PolicySection title="How long we keep it">
        <p>
          We keep account data while your account is open. Order and invoice records are kept for as long as Indian
          tax and accounting laws require, even after an account is closed. Security logs are kept for up to 180 days.
          Publishing files are kept for the life of the project and deleted on request once it ends, unless we need
          them to resolve a dispute.
        </p>
      </PolicySection>

      <PolicySection title="Your rights">
        <p>Under the DPDP Act you can:</p>
        <ul>
          <li>ask for a summary of the personal data we hold about you;</li>
          <li>ask us to correct, complete or update it;</li>
          <li>withdraw consent and ask us to erase it, where we are not legally required to keep it;</li>
          <li>nominate another person to exercise these rights if you die or become incapacitated;</li>
          <li>raise a grievance with us, and then with the Data Protection Board of India.</li>
        </ul>
        <p>
          You can update your name and addresses yourself under <Link href="/account">My account</Link>. For anything
          else, including closing your account, email <ContactLinks email={d.grievanceEmail} />.
        </p>
      </PolicySection>

      <PolicySection title="Children">
        <p>
          Accounts are for people aged 18 or over. Many of our products are for children, but they should be bought by
          a parent, guardian or school. We do not knowingly collect personal data from children.
        </p>
      </PolicySection>

      <PolicySection title="Security">
        <p>
          The site is served only over HTTPS, access to our systems is limited to staff who need it, and payment data
          is handled by Razorpay, a PCI-DSS compliant provider. No system is perfectly secure; if a breach affects
          your data we will notify you and the Data Protection Board as the law requires.
        </p>
      </PolicySection>

      <PolicySection title="Grievance Officer">
        <p>
          {d.grievanceName ? <strong>{d.grievanceName}</strong> : "Our Grievance Officer"} can be reached at{" "}
          <ContactLinks email={d.grievanceEmail} />. We acknowledge complaints within 48 hours and aim to resolve them
          within one month. See <Link href="/contact">Contact us</Link> for our full details.
        </p>
      </PolicySection>

      <PolicySection title="Changes to this policy">
        <p>
          We will post any changes on this page and update the date above. If a change is significant, we will also
          email account holders.
        </p>
      </PolicySection>
    </PolicyPage>
  );
}
