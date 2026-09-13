"use server";

import { getCurrentUser } from "@repo/auth/server";
import { prisma, type Address } from "@repo/database";

/**
 * Server actions backing the account "Saved addresses" section and the
 * checkout address picker/save-prompt. A customer may keep at most
 * MAX_ADDRESSES rows; the first address saved becomes the default, and
 * deleting the default promotes the next-oldest one.
 */

const MAX_ADDRESSES = 5;

export interface AddressInput {
  label?: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  phone?: string;
}

export type AddressActionResult = { ok: true; address: Address } | { ok: false; error: string };

function validate(input: AddressInput): string | null {
  if (!input.line1?.trim()) return "Address line is required.";
  if (!input.city?.trim()) return "City is required.";
  if (!input.state?.trim()) return "State is required.";
  if (!/^\d{6}$/.test(input.postalCode?.trim() ?? "")) return "Enter a valid 6-digit PIN code.";
  return null;
}

function toData(input: AddressInput) {
  return {
    label: input.label?.trim() || null,
    line1: input.line1.trim(),
    line2: input.line2?.trim() || null,
    city: input.city.trim(),
    state: input.state.trim(),
    postalCode: input.postalCode.trim(),
    phone: input.phone?.trim() || null,
  };
}

export async function getAddresses(): Promise<Address[]> {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function createAddress(input: AddressInput): Promise<AddressActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };

  const count = await prisma.address.count({ where: { userId: user.id } });
  if (count >= MAX_ADDRESSES) return { ok: false, error: `You can save up to ${MAX_ADDRESSES} addresses.` };

  const address = await prisma.address.create({
    data: { ...toData(input), userId: user.id, isDefault: count === 0 },
  });
  return { ok: true, address };
}

export async function updateAddress(id: string, input: AddressInput): Promise<AddressActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };

  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return { ok: false, error: "Address not found." };

  const address = await prisma.address.update({ where: { id }, data: toData(input) });
  return { ok: true, address };
}

export async function deleteAddress(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };

  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return { ok: false, error: "Address not found." };

  await prisma.address.delete({ where: { id } });

  if (existing.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }

  return { ok: true };
}
