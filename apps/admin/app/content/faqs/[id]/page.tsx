import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
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
      <h1 className="text-2xl font-bold">Edit FAQ</h1>
      <FaqForm action={updateFaq.bind(null, faq.id)} faq={faq} error={error} />
    </div>
  );
}
