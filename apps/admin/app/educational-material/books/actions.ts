"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, type Prisma, type BookFormat, type ProductType, type ProductLine } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import { productFormSchema, type ProductFormValues } from "./schema";

function toProductData(raw: ProductFormValues) {
  // A book's bookFormats[] is the source of truth for physical vs e-book;
  // `type` is derived from it so older code that still reads `type` (stock
  // relevance, URL prefix, etc.) keeps working. Physical wins when both are
  // picked, since that's the more restrictive listing (stock, ISBN, weight).
  const bookFormats: BookFormat[] = raw.isService
    ? []
    : [...(raw.formatPhysical ? (["PHYSICAL"] as const) : []), ...(raw.formatEbook ? (["EBOOK"] as const) : [])];
  const type: ProductType = raw.isService ? "SERVICE_PACKAGE" : bookFormats.includes("PHYSICAL") ? "PHYSICAL_BOOK" : "EBOOK";

  return {
    type,
    // This form only ever creates books or e-book-conversion service
    // packages; "Books" is the only one of the 8 fixed product lines it
    // covers, so the line is implied by isService rather than asked for.
    productLine: (raw.isService ? null : "BOOK") as ProductLine | null,
    bookFormats,
    title: raw.title,
    author: raw.author,
    slug: raw.slug,
    description: raw.description ?? null,
    genre: bookFormats.length ? (raw.genre ?? null) : null,
    priceCents: Math.round(raw.price * 100),
    ebookPriceCents:
      bookFormats.includes("PHYSICAL") && bookFormats.includes("EBOOK") && raw.ebookPrice !== undefined
        ? Math.round(raw.ebookPrice * 100)
        : null,
    coverImageUrl: raw.coverImageUrl ?? null,
    stockQty: bookFormats.includes("PHYSICAL") ? (raw.stockQty ?? null) : null,
    isbn: bookFormats.includes("PHYSICAL") ? (raw.isbn ?? null) : null,
    weightGrams: bookFormats.includes("PHYSICAL") ? (raw.weightGrams ?? null) : null,
    formats: bookFormats.includes("EBOOK")
      ? raw.formats
        ? raw.formats
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
        : []
      : [],
    sampleUrl: bookFormats.includes("EBOOK") ? (raw.sampleUrl ?? null) : null,
    turnaroundDays: raw.turnaroundDays ?? null,
    metaTitle: raw.metaTitle ?? null,
    metaDescription: raw.metaDescription ?? null,
    ogImageUrl: raw.ogImageUrl ?? null,
    isPublished: raw.isPublished,
    publishedAt: raw.isPublished ? new Date() : null,
  };
}

// FR-11.1: create a catalogue item (book, e-book, or service package).
export async function createProduct(formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const parsed = productFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/educational-material/books/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const data = toProductData(parsed.data);
  const product = await prisma.product.create({ data });

  await prisma.auditLog.create({
    // Log the submitted form values, not `data` — the latter includes a
    // Date (publishedAt), and AuditLog.diff is a plain Json column.
    data: { actorId: user!.id, actorEmail: user!.email, action: "product.created", entity: "Product", entityId: product.id, diff: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath("/educational-material/books");
  redirect("/educational-material/books");
}

// FR-11.1: edit an existing catalogue item.
export async function updateProduct(id: string, formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const parsed = productFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/educational-material/books/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const existing = await prisma.product.findUniqueOrThrow({ where: { id } });
  const data = toProductData(parsed.data);
  // Don't reset the original publish timestamp just because the item stayed published.
  if (existing.isPublished && parsed.data.isPublished) data.publishedAt = existing.publishedAt;

  await prisma.product.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: { actorId: user!.id, actorEmail: user!.email, action: "product.updated", entity: "Product", entityId: id, diff: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath("/educational-material/books");
  revalidatePath(`/educational-material/books/${id}`);
  redirect("/educational-material/books");
}

// Quick publish/unpublish toggle from the catalogue list — flips whatever
// the current DB state is, so it can't go stale between page load and click.
export async function toggleProductPublished(id: string) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const existing = await prisma.product.findUniqueOrThrow({ where: { id } });
  const nextPublished = !existing.isPublished;

  await prisma.product.update({
    where: { id },
    data: { isPublished: nextPublished, publishedAt: nextPublished ? new Date() : null },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: nextPublished ? "product.published" : "product.unpublished",
      entity: "Product",
      entityId: id,
      diff: { isPublished: nextPublished },
    },
  });

  revalidatePath("/educational-material/books");
}
