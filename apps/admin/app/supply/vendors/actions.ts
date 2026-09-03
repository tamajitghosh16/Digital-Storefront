"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, type Prisma } from "@repo/database";
import { getCurrentStaff } from "@repo/auth/server";
import { assertRole, CATALOGUE_WRITE_ROLES } from "@repo/auth/roles";
import { vendorFormSchema, type VendorFormValues } from "./schema";

function toVendorData(raw: VendorFormValues) {
  return {
    name: raw.name,
    contactName: raw.contactName ?? null,
    email: raw.email ?? null,
    phone: raw.phone ?? null,
    gstin: raw.gstin ?? null,
    addressLine: raw.addressLine ?? null,
    city: raw.city ?? null,
    state: raw.state ?? null,
    postalCode: raw.postalCode ?? null,
    notes: raw.notes ?? null,
    isActive: raw.isActive,
  };
}

export async function createVendor(formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const parsed = vendorFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/supply/vendors/new?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  const vendor = await prisma.vendor.create({ data: toVendorData(parsed.data) });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: "vendor.created",
      entity: "Vendor",
      entityId: vendor.id,
      diff: parsed.data as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/supply/vendors");
  redirect("/supply/vendors");
}

export async function updateVendor(id: string, formData: FormData) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const parsed = vendorFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    redirect(`/supply/vendors/${id}?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Invalid input")}`);
  }

  await prisma.vendor.update({ where: { id }, data: toVendorData(parsed.data) });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: "vendor.updated",
      entity: "Vendor",
      entityId: id,
      diff: parsed.data as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/supply/vendors");
  revalidatePath(`/supply/vendors/${id}`);
  redirect("/supply/vendors");
}

// Soft-deactivate rather than delete — purchase orders reference vendorId,
// and existing orders should stay readable even once a vendor is retired.
export async function toggleVendorActive(id: string) {
  const user = await getCurrentStaff();
  assertRole(user?.role, CATALOGUE_WRITE_ROLES);

  const existing = await prisma.vendor.findUniqueOrThrow({ where: { id } });
  const nextActive = !existing.isActive;

  await prisma.vendor.update({ where: { id }, data: { isActive: nextActive } });

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      actorEmail: user!.email,
      action: nextActive ? "vendor.activated" : "vendor.deactivated",
      entity: "Vendor",
      entityId: id,
      diff: { isActive: nextActive },
    },
  });

  revalidatePath("/supply/vendors");
}
