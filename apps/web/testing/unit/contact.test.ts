import { describe, expect, it } from "vitest";
import { mailtoUrl, whatsAppUrl } from "@/lib/contact";

describe("whatsAppUrl", () => {
  it("strips +, spaces and dashes down to the digits wa.me wants", () => {
    expect(whatsAppUrl("+91 98765-43210")).toBe("https://wa.me/919876543210");
  });

  it("drops a leading international 00 prefix", () => {
    expect(whatsAppUrl("0091 9876543210")).toBe("https://wa.me/919876543210");
  });

  it("encodes the pre-filled message", () => {
    expect(whatsAppUrl("919876543210", "Hi & hello?")).toBe("https://wa.me/919876543210?text=Hi%20%26%20hello%3F");
  });

  it("is null when unset, too short or too long", () => {
    expect(whatsAppUrl(undefined)).toBeNull();
    expect(whatsAppUrl("")).toBeNull();
    expect(whatsAppUrl("98765")).toBeNull();
    expect(whatsAppUrl("1234567890123456")).toBeNull();
  });
});

describe("mailtoUrl", () => {
  it("builds a mailto link with an encoded subject", () => {
    expect(mailtoUrl(" hello@example.in ", "Order query")).toBe("mailto:hello@example.in?subject=Order%20query");
  });

  it("is null for a blank or malformed address", () => {
    expect(mailtoUrl(null)).toBeNull();
    expect(mailtoUrl("   ")).toBeNull();
    expect(mailtoUrl("not-an-email")).toBeNull();
  });
});
