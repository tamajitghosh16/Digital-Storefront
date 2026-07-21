import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { updateTestimonial } from "../actions";
import { TestimonialForm } from "../testimonial-form";

export default async function EditTestimonialPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const testimonial = await prisma.testimonial.findUnique({ where: { id } });
  if (!testimonial) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold">Edit Testimonial</h1>
      <TestimonialForm action={updateTestimonial.bind(null, testimonial.id)} testimonial={testimonial} error={error} />
    </div>
  );
}
