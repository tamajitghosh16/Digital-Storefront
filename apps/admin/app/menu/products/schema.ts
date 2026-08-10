import { z } from "zod";
import { RESERVED_SLUGS } from "../reserved-slugs";

export const menuProductFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Category is required"),
  slug: z
    .string()
    .min(1, "Web address is required")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Web address must be lowercase letters, numbers, and hyphens only")
    .refine((slug) => !RESERVED_SLUGS.includes(slug), "That web address is already used elsewhere on the site"),
});

export type MenuProductFormValues = z.infer<typeof menuProductFormSchema>;
