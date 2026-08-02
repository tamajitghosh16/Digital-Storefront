import { PageHeader } from "@/components/ui";
import { createTestimonial } from "../actions";
import { TestimonialForm } from "../testimonial-form";

export default async function NewTestimonialPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader title="Add a testimonial" backHref="/content/testimonials" backLabel="Testimonials" />
      <TestimonialForm action={createTestimonial} error={error} />
    </div>
  );
}
