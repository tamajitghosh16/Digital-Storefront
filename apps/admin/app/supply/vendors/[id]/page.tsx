import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@repo/database";
import { PageHeader, Pill, Section } from "@/components/ui";
import { updateVendor } from "../actions";
import { VendorForm } from "../vendor-form";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

export default async function EditVendorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: { purchaseOrders: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
  if (!vendor) notFound();

  return (
    <div>
      <PageHeader
        title={vendor.name}
        backHref="/supply/vendors"
        backLabel="Vendors"
        action={<Pill tone={vendor.isActive ? "on" : "off"}>{vendor.isActive ? "Active" : "Inactive"}</Pill>}
      />
      <VendorForm action={updateVendor.bind(null, vendor.id)} vendor={vendor} error={error} />

      <div className="mt-8 max-w-3xl">
        <Section title="Purchase orders" description="Orders raised against this vendor.">
          {vendor.purchaseOrders.length === 0 ? (
            <p className="text-sm text-ink-muted">No purchase orders yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {vendor.purchaseOrders.map((po) => (
                <li key={po.id} className="flex items-center justify-between py-2.5 text-sm">
                  <Link
                    href={`/supply/purchase-orders/${po.id}`}
                    className="font-semibold text-ink hover:text-brand hover:underline"
                  >
                    PO-{String(po.poNumber).padStart(4, "0")}
                  </Link>
                  <span className="text-ink-muted">{money.format(po.totalCents / 100)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </div>
  );
}
