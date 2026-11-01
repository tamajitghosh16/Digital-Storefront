import Link from "next/link";
import { cn } from "@repo/ui/utils";
import { Breadcrumb, Callout, PageHeader, Standfirst, Wrap } from "@/components/primitives";
import { POLICY_PAGES } from "@/lib/navigation";

/**
 * The shared frame for the policy pages: the tinted header, a side nav that
 * links every policy to every other one (Razorpay's reviewers and customers
 * both look for them together), and a reading-width article whose headings,
 * paragraphs and lists are styled here so each page body stays plain JSX.
 */
export function PolicyPage({
  href,
  title,
  standfirst,
  lastUpdated,
  children,
}: {
  /** This page's entry in POLICY_PAGES — marks it current in the side nav. */
  href: string;
  title: string;
  standfirst: string;
  /** Omitted on the Contact page, which isn't a policy. */
  lastUpdated?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <Wrap>
        <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: title }]} />
      </Wrap>

      <PageHeader>
        <Callout tone="tile">Policies</Callout>
        <h1 className="mt-4">{title}</h1>
        <Standfirst>{standfirst}</Standfirst>
        {lastUpdated && <p className="mt-3 text-[13px] text-ink-muted">Last updated: {lastUpdated}</p>}
      </PageHeader>

      <Wrap className="grid gap-10 py-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label="Policies" className="lg:sticky lg:top-6 lg:self-start">
          <h2 className="caps mb-3 text-ink-muted">All policies</h2>
          <ul className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
            {POLICY_PAGES.map((page) => {
              const current = page.href === href;
              return (
                <li key={page.href}>
                  <Link
                    href={page.href}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "block rounded-btn px-3 py-2 text-sm",
                      current ? "bg-tile-2 font-bold text-ink" : "text-ink-muted hover:bg-tile hover:text-ink"
                    )}
                  >
                    {page.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <article
          className={cn(
            "max-w-[68ch] text-[15px] leading-[1.65] text-ink-muted",
            "[&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:text-ink [&>section:first-child>h2]:mt-0",
            "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-ink",
            "[&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1.5",
            "[&_a]:font-bold [&_a]:text-ink [&_a]:underline [&_a]:underline-offset-2",
            "[&_strong]:text-ink"
          )}
        >
          {children}
        </article>
      </Wrap>
    </>
  );
}

/** One numbered-free heading + body block inside a PolicyPage. */
export function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** "email@x / phone" as links, skipping whichever isn't set. */
export function ContactLinks({ email, phone }: { email: string | null; phone?: string | null }) {
  if (!email && !phone) return <>our support team</>;
  return (
    <>
      {email && <a href={`mailto:${email}`}>{email}</a>}
      {email && phone && " or "}
      {phone && <a href={`tel:${phone.replace(/\s+/g, "")}`}>{phone}</a>}
    </>
  );
}
