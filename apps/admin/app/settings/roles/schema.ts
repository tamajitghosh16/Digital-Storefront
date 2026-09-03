import { z } from "zod";

export const inviteStaffSchema = z.object({
  name: z.string().trim().min(1, "Enter the person's name").max(120, "That name is too long"),
  email: z
    .string()
    .trim()
    .min(1, "Enter an email address")
    .email("That doesn't look like an email address")
    .transform((value) => value.toLowerCase()),
});

export const STAFF_ROLES = ["READER", "SUPPORT", "EDITOR", "OWNER"] as const;

export const changeRoleSchema = z.object({
  userId: z.string().uuid("Unknown staff member"),
  role: z.enum(STAFF_ROLES),
});

export const removeStaffSchema = z.object({
  userId: z.string().uuid("Unknown staff member"),
});

export type InviteStaffValues = z.infer<typeof inviteStaffSchema>;
