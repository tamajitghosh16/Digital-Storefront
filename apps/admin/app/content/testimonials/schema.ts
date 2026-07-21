import { z } from "zod";

function optional<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((v) => (v === "" || v == null ? undefined : v), schema.optional());
}

export const testimonialFormSchema = z.object({
  authorName: z.string().min(1, "Author name is required"),
  quote: z.string().min(1, "Quote is required"),
  rating: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number().int().min(1).max(5).optional()
  ),
  imageUrl: optional(z.string().url("Must be a valid URL")),
  order: z.coerce.number().int().default(0),
  isActive: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type TestimonialFormValues = z.infer<typeof testimonialFormSchema>;
