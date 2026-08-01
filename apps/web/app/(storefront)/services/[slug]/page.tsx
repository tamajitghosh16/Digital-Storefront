import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { findSampleProduct, SERVICE_ADDONS } from "@/lib/sample-data";
import { formatINRWhole } from "@/lib/format";
import {
  Breadcrumb,
  Callout,
  CheckList,
  Rule,
  TABLE_CLASS,
  TD_CLASS,
  ROW_TH_CLASS,
  TableWrap,
  Wrap,
  buttonClass,
} from "@/components/primitives";
import { AddToCartButton } from "@/components/commerce/add-to-cart-button";

// Admin-controlled per-product SEO — see the apps/admin catalogue form.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = (await withFallback(() => prisma.product.findUnique({ where: { slug } }), null)) ?? findSampleProduct(slug);
  if (!product) return {};
  return {
    title: product.metaTitle || product.title,
    description: product.metaDescription || product.description || undefined,
    openGraph: product.ogImageUrl ? { images: [product.ogImageUrl] } : undefined,
  };
}

const PROCESS = [
  { step: "1", title: "Send the manuscript", body: "Word, Docs or plain text — whatever you wrote it in." },
  { step: "2", title: "We set and design", body: "Interior layout, front and back matter, and the cover." },
  { step: "3", title: "You review", body: "One consolidated round of changes, marked up however you like." },
  { step: "4", title: "Files delivered", body: "Store-ready files, yours to publish anywhere you choose." },
];

// FR-2.3: service package detail — features, price, turnaround.
export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = (await withFallback(() => prisma.product.findUnique({ where: { slug } }), null)) ?? findSampleProduct(slug);
  if (!product || product.type !== "SERVICE_PACKAGE") notFound();

  const features = (product.description ?? "").split("\n").filter(Boolean);

  return (
    <>
      <Wrap>
        <Breadcrumb
          trail={[
            { label: "Home", href: "/" },
            { label: "Publishing Services", href: "/services" },
            { label: product.title },
          ]}
        />
      </Wrap>

      <Wrap className="grid gap-9 pb-11 min-[980px]:grid-cols-[1fr_372px] min-[980px]:items-start min-[980px]:gap-12">
        <div className="min-w-0">
          <Callout>E-book creation package</Callout>
          <h1 className="mt-4">{product.title}</h1>

          {features.length > 0 && (
            <>
              <h2 className="mt-8">What&rsquo;s included</h2>
              <CheckList className="mt-3.5" items={features} />
            </>
          )}

          <Rule className="my-9" />

          <h2>How it works</h2>
          <ol className="mt-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
            {PROCESS.map((step) => (
              <li key={step.step} className="rounded-tile bg-tile p-5 inset-ring inset-ring-card-edge">
                <span className="grid h-[26px] w-[26px] place-items-center rounded-full bg-brand text-[11px] font-bold text-on-brand">
                  {step.step}
                </span>
                <h3 className="mt-2.5">{step.title}</h3>
                <p className="mt-1 text-sm leading-[1.5] text-ink-muted">{step.body}</p>
              </li>
            ))}
          </ol>

          <Rule className="my-9" />

          <h2 className="mb-4">Add-ons you can stack on</h2>
          <TableWrap>
            <table className={TABLE_CLASS}>
              <tbody>
                {SERVICE_ADDONS.map((addon) => (
                  <tr key={addon.name}>
                    <th scope="row" className={ROW_TH_CLASS}>
                      {addon.name}
                    </th>
                    <td className={`${TD_CLASS} tabular-nums`}>+{formatINRWhole(addon.priceCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>

        <div className="min-w-0 min-[980px]:sticky min-[980px]:top-[68px]">
          <div className="rounded-tile bg-ground p-[26px] inset-ring inset-ring-line">
            <p className="text-4xl font-bold leading-none tracking-[-0.03em] tabular-nums">
              {formatINRWhole(product.priceCents)}
            </p>
            <p className="mt-2 text-sm text-ink-muted">One-off price, inclusive of 18% GST</p>

            <CheckList
              className="mt-5"
              items={[
                product.turnaroundDays != null
                  ? `${product.turnaroundDays}-day turnaround from manuscript receipt`
                  : "Turnaround confirmed on upload",
                "You keep every right to the finished files",
                "A named contact for the whole project",
              ]}
            />

            <div className="mt-5 grid gap-2.5">
              <AddToCartButton
                className="w-full"
                product={{
                  productId: product.id,
                  title: product.title,
                  priceCents: product.priceCents,
                  fulfillmentType: "SERVICE",
                  taxType: "SERVICE_PACKAGE",
                  note: `E-book creation service · ${product.turnaroundDays ?? 5}-day turnaround`,
                }}
              />
              <Link href="/services" className={buttonClass("secondary", "lg", "w-full")}>
                Compare packages
              </Link>
            </div>
          </div>
        </div>
      </Wrap>
    </>
  );
}
