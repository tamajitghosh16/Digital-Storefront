import { describe, expect, it } from "vitest";
import { httpsUrl, safeHref } from "@/lib/schema-fields";
import { bannerFormSchema } from "@/app/content/banners/schema";

// Everything an editor types into a link or image field is rendered on the
// storefront, so these are the fields that keep `javascript:` out of it.

describe("httpsUrl", () => {
  it("accepts an absolute https address", () => {
    expect(httpsUrl().safeParse("https://cdn.example.com/cover.webp").success).toBe(true);
  });

  it.each(["http://cdn.example.com/cover.webp", "javascript:alert(1)", "data:image/png;base64,AAAA", "/cover.webp"])(
    "rejects %s",
    (value) => {
      expect(httpsUrl().safeParse(value).success).toBe(false);
    }
  );
});

describe("safeHref", () => {
  it.each(["/about", "#faq", "https://example.com", "mailto:hello@example.com", "tel:+911234567890"])(
    "accepts %s",
    (value) => {
      expect(safeHref().safeParse(value).success).toBe(true);
    }
  );

  it.each(["javascript:alert(1)", "data:text/html,<script>x</script>", "//evil.example"])("rejects %s", (value) => {
    expect(safeHref().safeParse(value).success).toBe(false);
  });
});

describe("bannerFormSchema", () => {
  const banner = { title: "New term, new books", order: "0", isActive: "on" };

  it("parses a submitted form", () => {
    expect(bannerFormSchema.parse(banner)).toMatchObject({ title: "New term, new books", order: 0, isActive: true });
  });

  it("treats an empty optional field as unset", () => {
    expect(bannerFormSchema.parse({ ...banner, ctaHref: "" }).ctaHref).toBeUndefined();
  });

  it("refuses an unsafe call-to-action link", () => {
    expect(bannerFormSchema.safeParse({ ...banner, ctaHref: "javascript:alert(1)" }).success).toBe(false);
  });
});
