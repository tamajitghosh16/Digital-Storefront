"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { Prisma, prisma } from "@repo/database";
import { getCurrentUser } from "@repo/auth/server";
import { assertRole, CONTENT_WRITE_ROLES } from "@repo/auth/roles";
import { testimonialFormSchema } from "./schema";

function toTestimonialData(raw: z.infer<typeof testimonialFormSchema>) {
  return {
    authorName: raw.authorName,
    quote: raw.quote,
    rating: raw.rating ?? null,
    imageUrl: raw.imageUrl ?? null,
    order: raw.order,
    isActive: raw.isActive,
  };
}

export async function createTestimonial(formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const parsed = testimonialFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/content/testimonials/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const data = toTestimonialData(parsed.data);
  const testimonial = await prisma.testimonial.create({ data });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      action: "testimonial.created",
      entity: "Testimonial",
      entityId: testimonial.id,
      diff: data as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/content/testimonials");
  redirect("/content/testimonials");
}

export async function updateTestimonial(id: string, formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const parsed = testimonialFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/content/testimonials/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const data = toTestimonialData(parsed.data);
  await prisma.testimonial.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: { actorId: user!.id, action: "testimonial.updated", entity: "Testimonial", entityId: id, diff: data as Prisma.InputJsonValue },
  });

  revalidatePath("/content/testimonials");
  revalidatePath(`/content/testimonials/${id}`);
  redirect("/content/testimonials");
}

export async function toggleTestimonialActive(id: string) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const existing = await prisma.testimonial.findUniqueOrThrow({ where: { id } });
  await prisma.testimonial.update({ where: { id }, data: { isActive: !existing.isActive } });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      action: "testimonial.toggled",
      entity: "Testimonial",
      entityId: id,
      diff: { isActive: !existing.isActive },
    },
  });

  revalidatePath("/content/testimonials");
}

export async function deleteTestimonial(id: string) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  await prisma.testimonial.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { actorId: user!.id, action: "testimonial.deleted", entity: "Testimonial", entityId: id, diff: Prisma.JsonNull },
  });

  revalidatePath("/content/testimonials");
}
