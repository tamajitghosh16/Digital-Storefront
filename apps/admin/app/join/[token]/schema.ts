import { z } from "zod";
import { STAFF_PASSWORD_MAX, STAFF_PASSWORD_MIN } from "@/lib/passwords";

export const staffSignUpSchema = z
  .object({
    password: z
      .string()
      .min(STAFF_PASSWORD_MIN, `Password must be at least ${STAFF_PASSWORD_MIN} characters`)
      .max(STAFF_PASSWORD_MAX, "That password is too long"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "The two passwords don't match",
    path: ["confirmPassword"],
  });

export type StaffSignUpValues = z.infer<typeof staffSignUpSchema>;
