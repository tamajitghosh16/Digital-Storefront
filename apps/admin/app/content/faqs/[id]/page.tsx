import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { PageHeader } from "@/components/ui";
import { updateFaq } from "../actions";
import { FaqForm } from "../faq-form";

export default async function EditFaqPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const faq = await prisma.faq.findUnique({ where: { id } });
  if (!faq) notFound();

  return (
    <div>
      <PageHeader title="Edit question" backHref="/content/faqs" backLabel="Questions & answers" />
      <FaqForm action={updateFaq.bind(null, faq.id)} faq={faq} error={error} />
    </div>
  );
}
