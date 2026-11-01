import { describe, expect, it } from "vitest";
import { generateInviteToken, hashInviteToken, inviteUrl } from "@/lib/staff-invites";
import { STAFF_PASSWORD_MIN } from "@/lib/passwords";
import { changeRoleSchema, inviteStaffSchema } from "@/app/settings/roles/schema";
import { staffSignUpSchema } from "@/app/join/[token]/schema";

describe("staff invites", () => {
  it("generates distinct, URL-safe tokens", () => {
    const a = generateInviteToken();
    const b = generateInviteToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("stores a hash, never the token itself", () => {
    const token = generateInviteToken();
    const hash = hashInviteToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashInviteToken(token)).toBe(hash);
  });

  it("builds the join link without a double slash", () => {
    expect(inviteUrl("https://admin.example.com/", "abc")).toBe("https://admin.example.com/join/abc");
  });

  it("normalises the invited email to lower case", () => {
    expect(inviteStaffSchema.parse({ name: "Ravi", email: " Ravi@Example.COM " }).email).toBe("ravi@example.com");
  });

  it("only accepts a known role", () => {
    const userId = "6f1c2b8e-4a5d-4c3e-9b7a-1d2e3f4a5b6c";
    expect(changeRoleSchema.safeParse({ userId, role: "EDITOR" }).success).toBe(true);
    expect(changeRoleSchema.safeParse({ userId, role: "SUPERUSER" }).success).toBe(false);
  });
});

describe("staffSignUpSchema", () => {
  it(`requires at least ${STAFF_PASSWORD_MIN} characters`, () => {
    const short = "a".repeat(STAFF_PASSWORD_MIN - 1);
    expect(staffSignUpSchema.safeParse({ password: short, confirmPassword: short }).success).toBe(false);
  });

  it("requires the two passwords to match", () => {
    const result = staffSignUpSchema.safeParse({ password: "correct horse battery", confirmPassword: "staple" });
    expect(result.error?.issues[0]?.path).toEqual(["confirmPassword"]);
  });
});
