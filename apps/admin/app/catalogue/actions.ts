"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, type Prisma } from "@repo/database";
import { getCurrentUser } from "@repo/auth/server";
import { assertRole, CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import { productFormSchema, type ProductFormValues } from "./schema";

function toProductData(raw: ProductFormValues) {
  return {
    type: raw.type,
    title: raw.title,
    author: raw.author,
    slug: raw.slug,
    description: raw.description ?? null,
    priceCents: Math.round(raw.price * 100),
    coverImageUrl: raw.coverImageUrl ?? null,
    stockQty: raw.stockQty ?? null,
    isbn: raw.isbn ?? null,
    weightGrams: raw.weightGrams ?? null,
    formats: raw.formats
      ? raw.formats
          .split(",")
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean)
      : [],
    sampleUrl: raw.sampleUrl ?? null,
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
  const user = await getCurrentUser();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const parsed = productFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/catalogue/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const data = toProductData(parsed.data);
  const product = await prisma.product.create({ data });

  await prisma.auditLog.create({
    // Log the submitted form values, not `data` — the latter includes a
    // Date (publishedAt), and AuditLog.diff is a plain Json column.
    data: { actorId: user!.id, action: "product.created", entity: "Product", entityId: product.id, diff: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath("/catalogue");
  redirect("/catalogue");
}

// FR-11.1: edit an existing catalogue item.
export async function updateProduct(id: string, formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const parsed = productFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/catalogue/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const existing = await prisma.product.findUniqueOrThrow({ where: { id } });
  const data = toProductData(parsed.data);
  // Don't reset the original publish timestamp just because the item stayed published.
  if (existing.isPublished && parsed.data.isPublished) data.publishedAt = existing.publishedAt;

  await prisma.product.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: { actorId: user!.id, action: "product.updated", entity: "Product", entityId: id, diff: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath("/catalogue");
  revalidatePath(`/catalogue/${id}`);
  redirect("/catalogue");
}

// Quick publish/unpublish toggle from the catalogue list — flips whatever
// the current DB state is, so it can't go stale between page load and click.
export async function toggleProductPublished(id: string) {
  const user = await getCurrentUser();
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
      action: nextPublished ? "product.published" : "product.unpublished",
      entity: "Product",
      entityId: id,
      diff: { isPublished: nextPublished },
    },
  });

  revalidatePath("/catalogue");
}
