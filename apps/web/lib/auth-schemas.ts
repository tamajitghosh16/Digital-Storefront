import { z } from "zod";

// Shared by app/sign-in and app/sign-up. These run in the browser before the
// Supabase call, so they're for the customer's benefit only — anyone holding
// the publishable key can call Supabase Auth directly. The real gate is the
// storefront project's own password policy (Authentication → Providers →
// Email), which should match PASSWORD_MIN_LENGTH here. Pure module (no
// "use client"), so a Server Action can parse with the same schemas later.

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 16;
export const NAME_MAX_LENGTH = 100;

/**
 * The new-account password policy, in the order the customer sees it. The
 * sign-up schema reports the first rule that fails; the sign-up page ticks
 * every rule off as the customer types. Sign-in deliberately doesn't apply
 * these, so accounts made before the policy can still sign in.
 */
export const PASSWORD_RULES: { label: string; message: string; test: (password: string) => boolean }[] = [
  {
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    message: `Choose a password of at least ${PASSWORD_MIN_LENGTH} characters.`,
    test: (password) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    label: `No more than ${PASSWORD_MAX_LENGTH} characters`,
    message: `Keep your password to ${PASSWORD_MAX_LENGTH} characters or fewer.`,
    test: (password) => password.length <= PASSWORD_MAX_LENGTH,
  },
  {
    label: "A lowercase letter",
    message: "Include at least one lowercase letter.",
    test: (password) => /[a-z]/.test(password),
  },
  {
    label: "An uppercase letter",
    message: "Include at least one uppercase letter.",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: "A number",
    message: "Include at least one number.",
    test: (password) => /[0-9]/.test(password),
  },
  {
    label: "One of @ & . ?",
    message: "Include at least one of these: @ & . ?",
    test: (password) => /[@&.?]/.test(password),
  },
];

const PHONE_PATTERN = /^\+?[0-9][0-9\s-]{6,18}[0-9]$/;

const email = z
  .string()
  .trim()
  .min(1, "Please enter your email.")
  .max(254, "That email address is too long.")
  .email("Please enter a valid email address.");

export const signInSchema = z.object({
  email,
  // No minimum beyond "present": an account created under an older, looser
  // policy must still be able to sign in.
  password: z.string().min(1, "Please enter your password."),
});

export const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Please enter your name.")
      .max(NAME_MAX_LENGTH, `Keep your name under ${NAME_MAX_LENGTH} characters.`),
    email,
    phone: z.string().trim().regex(PHONE_PATTERN, "Please enter a valid phone number."),
    password: z.string().superRefine((password, ctx) => {
      const failed = PASSWORD_RULES.find((rule) => !rule.test(password));
      if (failed) ctx.addIssue({ code: z.ZodIssueCode.custom, message: failed.message });
    }),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "The two passwords don't match.",
    path: ["confirmPassword"],
  });

export type SignInValues = z.input<typeof signInSchema>;
export type SignUpValues = z.input<typeof signUpSchema>;

export type FieldErrors<T> =Partial<Record<keyof T & string, string>>;

/** The first message per field, keyed by field name, for showing under each input. */
export function fieldErrors<T>(error: z.ZodError<T>): FieldErrors<T> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !(key in errors)) errors[key] = issue.message;
  }
  return errors as FieldErrors<T>;
}
