import Link from "next/link";
import { Breadcrumb, Callout, PageHeader, Standfirst, Wrap, buttonClass } from "@/components/primitives";

/**
 * Placeholder landing for a nav item that doesn't have a real page yet.
 * Swap for the real page once the vertical has one — see catalog.ts's
 * "What's real vs. what's a stub" note for the same pattern.
 */
export function DummyPage({ category, title, description }: { category: string; title: string; description: string }) {
  return (
    <>
      <Wrap>
        <Breadcrumb trail={[{ label: "Home", href: "/" }, { label: category }, { label: title }]} />
      </Wrap>

      <PageHeader>
        <Callout tone="tile">{category}</Callout>
        <h1 className="mt-4">{title}</h1>
        <Standfirst>{description}</Standfirst>
      </PageHeader>

      <Wrap className="py-12">
        <p className="max-w-[60ch] text-sm text-ink-subtle">
          This page is a placeholder — content and checkout for this vertical aren&rsquo;t built yet.
        </p>
        <Link href="/" className={buttonClass("primary", "md", "mt-5")}>
          Back to home
        </Link>
      </Wrap>
    </>
  );
}
