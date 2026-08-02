import { PageHeader } from "@/components/ui";
import { createBanner } from "../actions";
import { BannerForm } from "../banner-form";

export default async function NewBannerPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader title="Add a banner" backHref="/content/banners" backLabel="Homepage hero" />
      <BannerForm action={createBanner} error={error} />
    </div>
  );
}
