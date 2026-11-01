import { describe, expect, it } from "vitest";
import { PASSWORD_RULES, fieldErrors, signInSchema, signUpSchema } from "@/lib/auth-schemas";

const validSignUp = {
  name: "Asha Rao",
  email: "asha@example.com",
  phone: "+91 98765 43210",
  password: "Reader@2026",
  confirmPassword: "Reader@2026",
};

describe("signUpSchema", () => {
  it("accepts a complete, valid sign-up", () => {
    expect(signUpSchema.safeParse(validSignUp).success).toBe(true);
  });

  it.each([
    ["too short", "Ab1@", "at least 8"],
    ["too long", "Abcdefgh1@abcdefg", "16 characters or fewer"],
    ["no lowercase", "READER@2026", "lowercase"],
    ["no uppercase", "reader@2026", "uppercase"],
    ["no number", "Reader@abcd", "number"],
    ["no symbol", "Reader2026x", "@ & . ?"],
  ])("rejects a password that is %s", (_, password, message) => {
    const result = signUpSchema.safeParse({ ...validSignUp, password, confirmPassword: password });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!).password).toContain(message);
  });

  it("reports mismatched passwords on confirmPassword", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, confirmPassword: "Reader@2027" });
    expect(result.success).toBe(false);
    expect(fieldErrors(result.error!)).toEqual({ confirmPassword: "The two passwords don't match." });
  });

  it("rejects a malformed phone number", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, phone: "12ab" });
    expect(fieldErrors(result.error!).phone).toBe("Please enter a valid phone number.");
  });

  it("trims the email before validating it", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, email: "  asha@example.com  " });
    expect(result.success && result.data.email).toBe("asha@example.com");
  });
});

describe("signInSchema", () => {
  it("doesn't apply the new-account password policy", () => {
    // Accounts created before the policy must still be able to sign in.
    expect(signInSchema.safeParse({ email: "asha@example.com", password: "old" }).success).toBe(true);
  });

  it("requires both fields", () => {
    const result = signInSchema.safeParse({ email: "", password: "" });
    expect(fieldErrors(result.error!)).toEqual({
      email: "Please enter your email.",
      password: "Please enter your password.",
    });
  });
});

describe("PASSWORD_RULES", () => {
  it("are all satisfied by a valid password", () => {
    expect(PASSWORD_RULES.every((rule) => rule.test("Reader@2026"))).toBe(true);
  });
});
