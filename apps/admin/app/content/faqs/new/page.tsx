import { PageHeader } from "@/components/ui";
import { createFaq } from "../actions";
import { FaqForm } from "../faq-form";

export default async function NewFaqPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader title="Add a question" backHref="/content/faqs" backLabel="Questions & answers" />
      <FaqForm action={createFaq} error={error} />
    </div>
  );
}
