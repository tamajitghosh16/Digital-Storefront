"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, type Prisma } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import { getProductLineConfig, lineBasePath } from "./product-line-config";
import { simpleProductFormSchema, type SimpleProductFormValues } from "./schema";

/**
 * Create / edit / hide-show Server Actions for the three simpler
 * Educational Materials lines. The mirror of `../books/actions.ts`, minus
 * everything book- and service-specific.
 *
 * Each action takes the line's route `slug` as its first argument, bound by
 * the caller (`createLineProduct.bind(null, "educational-charts")`) — that's
 * what lets one set of actions serve all three sections. `slug` resolves to
 * the `ProductLine` enum value and the redirect target through
 * `getProductLineConfig`.
 *
 * Same guarantees as the Books actions: `assertRole(CATALOGUE_WRITE_ROLES)`
 * (the middleware check is a UX redirect, not a security boundary — see the
 * root CLAUDE.md), a validated payload, an `AuditLog` row, and a
 * `revalidatePath` of the affected pages.
 */

function toProductData(slug: string, raw: SimpleProductFormValues) {
  const { productLine } = getProductLineConfig(slug);
  return {
    // These lines ship as a physical parcel — stock-counted, weighed for
    // postage — so PHYSICAL_BOOK is the right fulfilment bucket. What
    // actually distinguishes them from books is `productLine`; `type` only
    // ever encoded fulfilment mechanics (see schema.prisma).
    type: "PHYSICAL_BOOK" as const,
    productLine,
    bookFormats: [],
    title: raw.title,
    author: raw.maker,
    slug: raw.slug,
    description: raw.description ?? null,
    genre: null,
    priceCents: Math.round(raw.price * 100),
    ebookPriceCents: null,
    coverImageUrl: raw.coverImageUrl ?? null,
    stockQty: raw.stockQty ?? null,
    isbn: raw.code ?? null,
    weightGrams: raw.weightGrams ?? null,
    formats: [],
    sampleUrl: null,
    turnaroundDays: null,
    metaTitle: raw.metaTitle ?? null,
    metaDescription: raw.metaDescription ?? null,
    ogImageUrl: raw.ogImageUrl ?? null,
    isPublished: raw.isPublished,
    publishedAt: raw.isPublished ? new Date() : null,
  };
}

export async function createLineProduct(slug: string, formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const base = lineBasePath(slug);
  const parsed = simpleProductFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`${base}/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const data = toProductData(slug, parsed.data);
  const product = await prisma.product.create({ data });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: "product.created",
      entity: "Product",
      entityId: product.id,
      diff: parsed.data as Prisma.InputJsonValue,
    },
  });

  revalidatePath(base);
  redirect(base);
}

export async function updateLineProduct(slug: string, id: string, formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const base = lineBasePath(slug);
  const parsed = simpleProductFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`${base}/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const existing = await prisma.product.findUniqueOrThrow({ where: { id } });
  const data = toProductData(slug, parsed.data);
  // Don't reset the original publish timestamp just because the item stayed published.
  if (existing.isPublished && parsed.data.isPublished) data.publishedAt = existing.publishedAt;

  await prisma.product.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: "product.updated",
      entity: "Product",
      entityId: id,
      diff: parsed.data as Prisma.InputJsonValue,
    },
  });

  revalidatePath(base);
  revalidatePath(`${base}/${id}`);
  redirect(base);
}

export async function toggleLineProductPublished(slug: string, id: string) {
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

  revalidatePath(lineBasePath(slug));
}
