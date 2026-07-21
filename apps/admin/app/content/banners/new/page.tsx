import { createBanner } from "../actions";
import { BannerForm } from "../banner-form";

export default async function NewBannerPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-bold">New Banner</h1>
      <BannerForm action={createBanner} error={error} />
    </div>
  );
}
