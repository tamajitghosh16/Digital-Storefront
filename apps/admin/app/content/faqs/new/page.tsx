import { createFaq } from "../actions";
import { FaqForm } from "../faq-form";

export default async function NewFaqPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-bold">New FAQ</h1>
      <FaqForm action={createFaq} error={error} />
    </div>
  );
}
