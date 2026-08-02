import Link from "next/link";
import { prisma } from "@repo/database";
import { ButtonLink, PageHeader } from "@/components/ui";

// FR-11.2/FR-11.3: at-a-glance queue of new orders and submissions so
// nothing gets missed (BRD Section 6, Publisher/Admin user story), plus
// shortcuts into the handful of jobs a publisher actually does weekly.
export default async function AdminDashboard() {
  const [newOrders, pendingSubmissions, pendingServiceRequests, liveProducts, draftProducts] = await Promise.all([
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.selfPublishingProject.count({ where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
    prisma.serviceRequest.count({ where: { status: "SUBMITTED" } }),
    prisma.product.count({ where: { isPublished: true } }),
    prisma.product.count({ where: { isPublished: false } }),
  ]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Dashboard"
        description="What needs attention today, and the quickest way into everything else."
        action={<ButtonLink href="/catalogue/new">Add a book</ButtonLink>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders to process" value={newOrders} href="/orders" />
        <StatCard label="Self-publishing submissions" value={pendingSubmissions} href="/submissions" />
        <StatCard label="Service requests" value={pendingServiceRequests} href="/submissions" />
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <StatCard label="Books & products in the shop" value={liveProducts} href="/catalogue" tone="quiet" />
        <StatCard label="Hidden, not yet in the shop" value={draftProducts} href="/catalogue" tone="quiet" />
      </div>

      <section className="mt-8 rounded-tile border border-line bg-ground p-6">
        <h2 className="text-base font-bold tracking-[-0.01em] text-ink">Everyday jobs</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Shortcut
            href="/catalogue/new"
            title="Add a book"
            body="Printed, e-book, or a service package — with its front cover."
          />
          <Shortcut
            href="/content/banners"
            title="Change the homepage hero"
            body="The big headline and buttons at the top of the site."
          />
          <Shortcut
            href="/content/homepage"
            title="Change homepage wording"
            body="Every other heading and description on the homepage."
          />
          <Shortcut
            href="/settings/pricing"
            title="Pricing & delivery"
            body="Postage, bulk discounts, GST, and discount codes."
          />
          <Shortcut href="/content/faqs" title="Questions & answers" body="What appears in the FAQ section." />
          <Shortcut
            href="/settings/site"
            title="Site details"
            body="Shop name, logo, contact details and social links."
          />
        </div>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
  tone = "loud",
}: {
  label: string;
  value: number;
  href: string;
  tone?: "loud" | "quiet";
}) {
  return (
    <Link
      href={href}
      className="block rounded-tile border border-line bg-ground p-5 transition-colors hover:border-brand"
    >
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
      <p
        className={
          tone === "loud"
            ? "mt-2 text-4xl font-bold tabular-nums text-brand"
            : "mt-2 text-3xl font-bold tabular-nums text-ink"
        }
      >
        {value}
      </p>
    </Link>
  );
}

function Shortcut({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="rounded-btn border border-line bg-tile-3 p-4 transition-colors hover:border-brand hover:bg-brand-soft"
    >
      <p className="text-sm font-bold text-ink">{title} →</p>
      <p className="mt-1 text-[13px] leading-snug text-ink-muted">{body}</p>
    </Link>
  );
}
