"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { Prisma, prisma } from "@repo/database";
import { getCurrentUser } from "@repo/auth/server";
import { assertRole, CONTENT_WRITE_ROLES } from "@repo/auth/roles";
import { bannerFormSchema } from "./schema";

function toBannerData(raw: z.infer<typeof bannerFormSchema>) {
  return {
    eyebrow: raw.eyebrow ?? null,
    title: raw.title,
    subtitle: raw.subtitle ?? null,
    imageUrl: raw.imageUrl ?? null,
    ctaText: raw.ctaText ?? null,
    ctaHref: raw.ctaHref ?? null,
    secondaryCtaText: raw.secondaryCtaText ?? null,
    secondaryCtaHref: raw.secondaryCtaHref ?? null,
    order: raw.order,
    isActive: raw.isActive,
  };
}

export async function createBanner(formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const parsed = bannerFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/content/banners/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const data = toBannerData(parsed.data);
  const banner = await prisma.banner.create({ data });

  await prisma.auditLog.create({
    data: { actorId: user!.id, action: "banner.created", entity: "Banner", entityId: banner.id, diff: data as Prisma.InputJsonValue },
  });

  revalidatePath("/content/banners");
  redirect("/content/banners");
}

export async function updateBanner(id: string, formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const parsed = bannerFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/content/banners/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const data = toBannerData(parsed.data);
  await prisma.banner.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: { actorId: user!.id, action: "banner.updated", entity: "Banner", entityId: id, diff: data as Prisma.InputJsonValue },
  });

  revalidatePath("/content/banners");
  revalidatePath(`/content/banners/${id}`);
  redirect("/content/banners");
}

export async function toggleBannerActive(id: string) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const existing = await prisma.banner.findUniqueOrThrow({ where: { id } });
  await prisma.banner.update({ where: { id }, data: { isActive: !existing.isActive } });

  await prisma.auditLog.create({
    data: { actorId: user!.id, action: "banner.toggled", entity: "Banner", entityId: id, diff: { isActive: !existing.isActive } },
  });

  revalidatePath("/content/banners");
}

export async function deleteBanner(id: string) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  await prisma.banner.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { actorId: user!.id, action: "banner.deleted", entity: "Banner", entityId: id, diff: Prisma.JsonNull },
  });

  revalidatePath("/content/banners");
}
