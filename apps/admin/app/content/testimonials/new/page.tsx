import { createTestimonial } from "../actions";
import { TestimonialForm } from "../testimonial-form";

export default async function NewTestimonialPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-bold">New Testimonial</h1>
      <TestimonialForm action={createTestimonial} error={error} />
    </div>
  );
}
