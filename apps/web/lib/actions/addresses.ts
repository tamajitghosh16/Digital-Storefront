"use server";

import { getCurrentUser } from "@repo/auth/server";
import { prisma, type Address } from "@repo/database";
import { RATE_LIMITS, rateLimit } from "@repo/security/rate-limit";
import { isIndianState } from "@/lib/india-address";

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
  district: string;
  city: string;
  state: string;
  postalCode: string;
  phone?: string;
}

export type AddressActionResult = { ok: true; address: Address } | { ok: false; error: string };

const LIMITS = { label: 40, line1: 200, line2: 200, district: 100, city: 100 } as const;

function tooLong(value: string | undefined, max: number): boolean {
  return typeof value === "string" && value.trim().length > max;
}

function validate(input: AddressInput): string | null {
  if (!input || typeof input !== "object") return "Please check the address and try again.";
  for (const key of ["label", "line1", "line2", "district", "city", "state", "postalCode", "phone"] as const) {
    if (input[key] != null && typeof input[key] !== "string") return "Please check the address and try again.";
  }
  if (!input.line1?.trim()) return "Address line 1 is required.";
  if (!isIndianState(input.state?.trim() ?? "")) return "Choose a state or union territory.";
  if (!input.district?.trim()) return "District is required.";
  if (!input.city?.trim()) return "City is required.";
  for (const [key, max] of Object.entries(LIMITS) as [keyof typeof LIMITS, number][]) {
    if (tooLong(input[key], max)) return `That ${key === "line1" || key === "line2" ? "address line" : key} is too long.`;
  }
  if (!/^\d{6}$/.test(input.postalCode?.trim() ?? "")) return "Enter a valid 6-digit PIN code.";
  if (input.phone?.trim() && !/^\+?[0-9 ()-]{7,20}$/.test(input.phone.trim())) return "Enter a valid phone number.";
  return null;
}

async function withinLimit(userId: string): Promise<boolean> {
  return (await rateLimit(RATE_LIMITS.accountWrite, userId)).ok;
}

const RATE_LIMITED = "Too many changes in a short time. Please wait a minute and try again.";

function toData(input: AddressInput) {
  return {
    label: input.label?.trim() || null,
    line1: input.line1.trim(),
    line2: input.line2?.trim() || null,
    district: input.district.trim(),
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
  if (!(await withinLimit(user.id))) return { ok: false, error: RATE_LIMITED };

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
  if (!(await withinLimit(user.id))) return { ok: false, error: RATE_LIMITED };

  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };

  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return { ok: false, error: "Address not found." };
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return { ok: false, error: "Address not found." };

  const address = await prisma.address.update({ where: { id }, data: toData(input) });
  return { ok: true, address };
}

export async function deleteAddress(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "SIGN_IN_REQUIRED" };
  if (!(await withinLimit(user.id))) return { ok: false, error: RATE_LIMITED };

  if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return { ok: false, error: "Address not found." };
  const existing = await prisma.address.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) return { ok: false, error: "Address not found." };

  await prisma.address.delete({ where: { id } });

  if (existing.isDefault) {
    const next = await prisma.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "asc" } });
    if (next) await prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
  }

  return { ok: true };
}
