import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { PageHeader } from "@/components/ui";
import { updateBanner } from "../actions";
import { BannerForm } from "../banner-form";

export default async function EditBannerPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const banner = await prisma.banner.findUnique({ where: { id } });
  if (!banner) notFound();

  return (
    <div>
      <PageHeader title="Edit banner" backHref="/content/banners" backLabel="Homepage hero" />
      <BannerForm action={updateBanner.bind(null, banner.id)} banner={banner} error={error} />
    </div>
  );
}
