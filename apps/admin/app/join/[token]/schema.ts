import { z } from "zod";

export const staffSignUpSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The two passwords don't match",
    path: ["confirmPassword"],
  });

export type StaffSignUpValues = z.infer<typeof staffSignUpSchema>;
