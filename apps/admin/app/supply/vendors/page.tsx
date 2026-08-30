import { prisma } from "@repo/database";
import { ButtonLink, PageHeader } from "@/components/ui";
import { VendorsList } from "./vendors-list";

export default async function VendorsPage() {
  const vendors = await prisma.vendor.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-5xl pt-10">
      <PageHeader
        title="All Vendors"
        description="Suppliers the Press orders physical stock from."
        action={<ButtonLink href="/supply/vendors/new">Add vendor</ButtonLink>}
      />
      <VendorsList vendors={vendors} />
    </div>
  );
}
