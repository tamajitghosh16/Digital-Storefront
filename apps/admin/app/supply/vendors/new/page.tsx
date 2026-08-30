import { PageHeader } from "@/components/ui";
import { createVendor } from "../actions";
import { VendorForm } from "../vendor-form";

export default async function NewVendorPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Add a vendor"
        description="Fill in what you know — you can come back and change any of it later."
        backHref="/supply/vendors"
        backLabel="Vendors"
      />
      <VendorForm action={createVendor} error={error} />
    </div>
  );
}
