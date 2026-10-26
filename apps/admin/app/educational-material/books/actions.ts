"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { revalidateStorefront } from "@/lib/storefront-cache";
import { prisma, type Prisma, type BookFormat, type ProductType, type ProductLine } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import { deleteEbookFile, isStoredEbookPdf } from "@repo/storage";
import { securityEvent } from "@repo/security/log";
import { productFormSchema, type ProductFormValues } from "./schema";

/**
 * Reconcile the single `EBOOK_FILE` FileAsset for a product against what the
 * form submitted. PdfField uploads the PDF to Supabase Storage before the
 * form posts, so by the time we're here `ebookFilePath` (if set) already
 * points at a stored object.
 *
 * The asset is written with `malwareScanStatus: "CLEAN"` and no scan, the
 * same trust model as admin image uploads — it comes from a signed-in
 * EDITOR/OWNER. `maxDownloads: 5` matches the storefront's "Five downloads
 * per e-book format" promise.
 */
async function syncEbookFileAsset(productId: string, raw: ProductFormValues) {
  const wantsEbook = !raw.isService && raw.formatEbook;
  const nextPath = wantsEbook ? raw.ebookFilePath?.trim() || null : null;

  const existing = await prisma.fileAsset.findFirst({ where: { productId, kind: "EBOOK_FILE" } });
  if (existing?.blobPath === nextPath) return; // nothing changed

  if (existing) {
    await prisma.fileAsset.delete({ where: { id: existing.id } });
    if (existing.blobPath && existing.blobPath !== nextPath && !/^https?:\/\//.test(existing.blobPath)) {
      await deleteEbookFile(existing.blobPath);
    }
  }

  if (nextPath) {
    await prisma.fileAsset.create({
      data: {
        kind: "EBOOK_FILE",
        blobPath: nextPath,
        fileName: raw.ebookFileName?.trim() || "ebook.pdf",
        mimeType: "application/pdf",
        sizeBytes: raw.ebookFileSize ?? 0,
        malwareScanStatus: "CLEAN",
        maxDownloads: 5,
        productId,
      },
    });
  }
}

/**
 * The e-book PDF bypasses the app server (signed upload URL straight to
 * Storage), so before a new object is attached to a product, check what
 * actually arrived: a path we minted, holding a real PDF. Returns an error
 * message, or null when the file is fine or unchanged.
 */
async function ebookUploadProblem(raw: ProductFormValues, productId?: string): Promise<string | null> {
  const nextPath = !raw.isService && raw.formatEbook ? raw.ebookFilePath?.trim() || null : null;
  if (!nextPath) return null;
  if (productId) {
    const existing = await prisma.fileAsset.findFirst({ where: { productId, kind: "EBOOK_FILE" }, select: { blobPath: true } });
    if (existing?.blobPath === nextPath) return null; // unchanged
  }
  if (!(await isStoredEbookPdf(nextPath).catch(() => false))) {
    securityEvent("upload.rejected", { reason: "e-book is not a PDF or path not minted by us", path: nextPath.slice(0, 120) });
    await deleteEbookFile(nextPath);
    return "The uploaded e-book isn't a valid PDF. Please upload the file again.";
  }
  return null;
}

const toCents = (rupees: number) => Math.round(rupees * 100);

/**
 * The editions a submitted book form describes — one per ticked format,
 * each with its own price and (for the two printed formats) stock. Empty
 * for a service package.
 */
function toEditions(raw: ProductFormValues): { format: BookFormat; priceCents: number; stockQty: number | null }[] {
  if (raw.isService) return [];
  return [
    ...(raw.formatPaperback
      ? [{ format: "PAPERBACK" as const, priceCents: toCents(raw.paperbackPrice ?? 0), stockQty: raw.paperbackStock ?? null }]
      : []),
    ...(raw.formatHardcover
      ? [{ format: "HARDCOVER" as const, priceCents: toCents(raw.hardcoverPrice ?? 0), stockQty: raw.hardcoverStock ?? null }]
      : []),
    ...(raw.formatEbook ? [{ format: "EBOOK" as const, priceCents: toCents(raw.ebookPrice ?? 0), stockQty: null }] : []),
  ];
}

function toProductData(raw: ProductFormValues) {
  // A book's editions are the source of truth for its formats, prices and
  // stock; `type` is derived from them so older code that still reads
  // `type` (URL prefix, purchase orders, etc.) keeps working. Print wins
  // when any printed format is picked, since that's the more restrictive
  // listing (stock, ISBN, weight).
  const editions = toEditions(raw);
  const hasPrint = editions.some((edition) => edition.format !== "EBOOK");
  const hasEbook = editions.some((edition) => edition.format === "EBOOK");
  const isBook = !raw.isService;
  const type: ProductType = raw.isService ? "SERVICE_PACKAGE" : hasPrint ? "PHYSICAL_BOOK" : "EBOOK";

  return {
    type,
    // This form only ever creates books or e-book-conversion service
    // packages; "Books" is the only one of the 8 fixed product lines it
    // covers, so the line is implied by isService rather than asked for.
    productLine: (raw.isService ? null : "BOOK") as ProductLine | null,
    title: raw.title,
    author: raw.author,
    slug: raw.slug,
    description: raw.description ?? null,
    genre: isBook ? (raw.genre ?? null) : null,
    language: isBook ? (raw.language ?? null) : null,
    // A book's listing price is its cheapest edition (see the schema
    // comment on Product.priceCents); a package has the one price.
    priceCents: isBook ? Math.min(...editions.map((edition) => edition.priceCents)) : toCents(raw.price ?? 0),
    coverImageUrl: raw.coverImageUrl ?? null,
    backCoverImageUrl: raw.backCoverImageUrl ?? null,
    prefaceImageUrl: raw.prefaceImageUrl ?? null,
    indexPageImageUrl: raw.indexPageImageUrl ?? null,
    // A book's stock lives on its printed editions, never here.
    stockQty: null,
    isbn: isBook ? (raw.isbn ?? null) : null,
    weightGrams: hasPrint ? (raw.weightGrams ?? null) : null,
    formats: hasEbook
      ? raw.formats
        ? raw.formats
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
        : []
      : [],
    sampleUrl: hasEbook ? (raw.sampleUrl ?? null) : null,
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

  // The "Add a book" form is a modal on the list page (see add-book-dialog.tsx),
  // so both outcomes redirect back there: `?error=` reopens the dialog with the
  // message, `?created=1` leaves it shut and shows the saved banner.
  const parsed = productFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/educational-material/books?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const ebookProblem = await ebookUploadProblem(parsed.data);
  if (ebookProblem) redirect(`/educational-material/books?error=${encodeURIComponent(ebookProblem)}`);

  const data = toProductData(parsed.data);
  const product = await prisma.product.create({
    data: { ...data, editions: { create: toEditions(parsed.data) } },
  });
  await syncEbookFileAsset(product.id, parsed.data);

  await prisma.auditLog.create({
    // Log the submitted form values, not `data` — the latter includes a
    // Date (publishedAt), and AuditLog.diff is a plain Json column.
    data: { actorId: user!.id, actorEmail: user!.email, action: "product.created", entity: "Product", entityId: product.id, diff: parsed.data as Prisma.InputJsonValue },
  });

  revalidateStorefront();
  revalidatePath("/educational-material/books");
  redirect("/educational-material/books?created=1");
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
  const ebookProblem = await ebookUploadProblem(parsed.data, id);
  if (ebookProblem) redirect(`/educational-material/books/${id}?error=${encodeURIComponent(ebookProblem)}`);

  const data = toProductData(parsed.data);
  // Don't reset the original publish timestamp just because the item stayed published.
  if (existing.isPublished && parsed.data.isPublished) data.publishedAt = existing.publishedAt;

  // Replace the edition set in one write: formats that were unticked are
  // dropped (order lines keep their own `bookFormat`, so history survives),
  // the rest are upserted so an edition's id is stable across saves.
  const editions = toEditions(parsed.data);
  await prisma.product.update({
    where: { id },
    data: {
      ...data,
      editions: {
        deleteMany: { format: { notIn: editions.map((edition) => edition.format) } },
        upsert: editions.map((edition) => ({
          where: { productId_format: { productId: id, format: edition.format } },
          create: edition,
          update: { priceCents: edition.priceCents, stockQty: edition.stockQty },
        })),
      },
    },
  });
  await syncEbookFileAsset(id, parsed.data);

  await prisma.auditLog.create({
    data: { actorId: user!.id, actorEmail: user!.email, action: "product.updated", entity: "Product", entityId: id, diff: parsed.data as Prisma.InputJsonValue },
  });

  revalidateStorefront();
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

  revalidateStorefront();
  revalidatePath("/educational-material/books");
}
