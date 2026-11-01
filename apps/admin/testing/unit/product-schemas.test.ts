import { describe, expect, it } from "vitest";
import { productFormSchema } from "@/app/educational-material/books/schema";
import { simpleProductFormSchema } from "@/app/educational-material/_shared/schema";

// Stock is compulsory for anything printed, and an e-book can't be listed
// without the PDF the buyer downloads.

const book = {
  isService: "false",
  title: "The Bookseller of Kolkata",
  author: "Shashibhushan Roy",
  slug: "the-bookseller-of-kolkata",
  isPublished: "true",
};

function bookIssues(fields: Record<string, string>) {
  const parsed = productFormSchema.safeParse({ ...book, ...fields });
  return parsed.success ? [] : parsed.error.issues.map((issue) => issue.path.join("."));
}

describe("productFormSchema stock and PDF", () => {
  it("requires stock for each ticked printed format", () => {
    expect(bookIssues({ formatPaperback: "on", paperbackPrice: "250" })).toContain("paperbackStock");
    expect(bookIssues({ formatHardcover: "on", hardcoverPrice: "450" })).toContain("hardcoverStock");
  });

  it("accepts zero copies in stock", () => {
    expect(bookIssues({ formatPaperback: "on", paperbackPrice: "250", paperbackStock: "0" })).toEqual([]);
  });

  it("asks for no stock on an e-book, but does need its PDF", () => {
    expect(bookIssues({ formatEbook: "on", ebookPrice: "99" })).toEqual(["ebookFilePath"]);
    expect(bookIssues({ formatEbook: "on", ebookPrice: "99", ebookFilePath: "ebooks/abc.pdf" })).toEqual([]);
  });
});

describe("simpleProductFormSchema stock", () => {
  const item = { title: "Solar system chart", maker: "New School Book Press", slug: "solar-system-chart", price: "120", isPublished: "true" };

  it("requires copies in stock", () => {
    expect(simpleProductFormSchema.safeParse(item).success).toBe(false);
    expect(simpleProductFormSchema.safeParse({ ...item, stockQty: "" }).success).toBe(false);
  });

  it("accepts a whole number of zero or more", () => {
    expect(simpleProductFormSchema.safeParse({ ...item, stockQty: "0" }).success).toBe(true);
    expect(simpleProductFormSchema.safeParse({ ...item, stockQty: "-1" }).success).toBe(false);
  });
});
