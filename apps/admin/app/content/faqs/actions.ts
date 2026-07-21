"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Prisma, prisma } from "@repo/database";
import { getCurrentUser } from "@repo/auth/server";
import { assertRole, CONTENT_WRITE_ROLES } from "@repo/auth/roles";
import { faqFormSchema } from "./schema";

export async function createFaq(formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const parsed = faqFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/content/faqs/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const faq = await prisma.faq.create({ data: parsed.data });

  await prisma.auditLog.create({
    data: { actorId: user!.id, action: "faq.created", entity: "Faq", entityId: faq.id, diff: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath("/content/faqs");
  redirect("/content/faqs");
}

export async function updateFaq(id: string, formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const parsed = faqFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/content/faqs/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  await prisma.faq.update({ where: { id }, data: parsed.data });

  await prisma.auditLog.create({
    data: { actorId: user!.id, action: "faq.updated", entity: "Faq", entityId: id, diff: parsed.data as Prisma.InputJsonValue },
  });

  revalidatePath("/content/faqs");
  revalidatePath(`/content/faqs/${id}`);
  redirect("/content/faqs");
}

export async function toggleFaqActive(id: string) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const existing = await prisma.faq.findUniqueOrThrow({ where: { id } });
  await prisma.faq.update({ where: { id }, data: { isActive: !existing.isActive } });

  await prisma.auditLog.create({
    data: { actorId: user!.id, action: "faq.toggled", entity: "Faq", entityId: id, diff: { isActive: !existing.isActive } },
  });

  revalidatePath("/content/faqs");
}

export async function deleteFaq(id: string) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  await prisma.faq.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { actorId: user!.id, action: "faq.deleted", entity: "Faq", entityId: id, diff: Prisma.JsonNull },
  });

  revalidatePath("/content/faqs");
}
