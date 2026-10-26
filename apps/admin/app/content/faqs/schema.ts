import { z } from "zod";

export const faqFormSchema = z.object({
  question: z.string().min(1, "Question is required").max(500, "That's too long"),
  answer: z.string().min(1, "Answer is required").max(5000, "That's too long"),
  order: z.coerce.number().int().default(0),
  isActive: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
});

export type FaqFormValues = z.infer<typeof faqFormSchema>;
