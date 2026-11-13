import { afterEach, describe, expect, it, vi } from "vitest";
import { securityEvent } from "./log";

describe("securityEvent", () => {
  afterEach(() => vi.restoreAllMocks());

  function logged(details: Record<string, unknown>): Record<string, unknown> {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    securityEvent("auth.forbidden", details);
    return JSON.parse(String(warn.mock.calls[0]?.[0]));
  }

  it("marks the line and names the event", () => {
    expect(logged({})).toMatchObject({ security: true, event: "auth.forbidden" });
  });

  it.each(["password", "newPassword", "refresh_token", "x-signature", "Authorization", "cookie", "otp", "otpCode", "authCode", "clientSecret"])(
    "redacts %s",
    (key) => expect(logged({ [key]: "s3cret" })[key]).toBe("[redacted]")
  );

  it.each(["email", "userId", "ip", "codeLength", "orderId"])("keeps %s", (key) => {
    expect(logged({ [key]: "visible" })[key]).toBe("visible");
  });
});
