"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { revalidateStorefront } from "@/lib/storefront-cache";
import { prisma, SITE_SETTINGS_ID, type Prisma } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, CONTENT_WRITE_ROLES } from "@repo/auth/roles";
import { siteSettingsFormSchema } from "./schema";

// FR-11.1-adjacent: the one screen that controls apps/web's global branding,
// default SEO metadata, and contact/social info (rendered in its root layout).
export async function updateSiteSettings(formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const parsed = siteSettingsFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/settings/site?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const { twitterUrl, facebookUrl, instagramUrl, ...rest } = parsed.data;
  const data: Omit<Prisma.SiteSettingsUncheckedCreateInput, "id"> = {
    ...rest,
    tagline: rest.tagline ?? null,
    metaTitle: rest.metaTitle ?? null,
    metaDescription: rest.metaDescription ?? null,
    ogImageUrl: rest.ogImageUrl ?? null,
    logoUrl: rest.logoUrl ?? null,
    contactEmail: rest.contactEmail ?? null,
    contactPhone: rest.contactPhone ?? null,
    addressLine: rest.addressLine ?? null,
    socialLinks: { twitter: twitterUrl ?? "", facebook: facebookUrl ?? "", instagram: instagramUrl ?? "" },
  };

  await prisma.siteSettings.upsert({
    where: { id: SITE_SETTINGS_ID },
    update: data,
    create: { id: SITE_SETTINGS_ID, ...data },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: "site_settings.updated",
      entity: "SiteSettings",
      entityId: SITE_SETTINGS_ID,
      diff: data as Prisma.InputJsonValue,
    },
  });

  // apps/web and apps/admin are separate deployed Next.js apps — a
  // revalidatePath() call here only affects admin's own cache. apps/web
  // caches site settings (apps/web/lib/cms.ts), so it's told to drop that
  // cache explicitly.
  revalidateStorefront();
  revalidatePath("/settings/site");
  redirect("/settings/site?saved=1");
}
