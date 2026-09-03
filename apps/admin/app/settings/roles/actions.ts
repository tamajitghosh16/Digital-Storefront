"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma, type Prisma, type Role } from "@repo/database";
import {
  deleteStaffAccount,
  getCurrentStaff,
  getStaffByEmail,
  listStaffAccounts,
  setStaffRole,
} from "@repo/auth/server";
import { assertRole, OWNER_ONLY_ROLES } from "@repo/auth/roles";
import { sendStaffInvite } from "@repo/email";
import {
  INVITE_TTL_MS,
  INVITE_TTL_MINUTES,
  adminOrigin,
  generateInviteToken,
  hashInviteToken,
  inviteUrl,
} from "@/lib/staff-invites";
import { changeRoleSchema, inviteStaffSchema, removeStaffSchema } from "./schema";

const ROLES_PATH = "/settings/roles";
const fail = (message: string) => redirect(`${ROLES_PATH}?error=${encodeURIComponent(message)}`);

/**
 * Owner adds a name + email; we create a one-time, 1-hour invite and email
 * the `/join/<token>` link. The person sets a password there and the account
 * is created as READER — promotion happens via `changeStaffRole` below.
 */
export async function inviteStaff(formData: FormData) {
  const owner = await getCurrentStaff();
  assertRole(owner?.role, OWNER_ONLY_ROLES);

  const parsed = inviteStaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Please check the form and try again.");
    return;
  }
  const { name, email } = parsed.data;

  if (await getStaffByEmail(email)) {
    fail(`${email} already has a staff account. Change their role below instead.`);
    return;
  }

  // A fresh invite supersedes any earlier unredeemed one for this email.
  await prisma.staffInvite.deleteMany({ where: { email, acceptedAt: null } });

  const token = generateInviteToken();
  const invite = await prisma.staffInvite.create({
    data: {
      email,
      name,
      tokenHash: hashInviteToken(token),
      expiresAt: new Date(Date.now() + INVITE_TTL_MS),
      invitedById: owner!.id,
      invitedByEmail: owner!.email,
    },
  });

  try {
    const origin = await adminOrigin();
    await sendStaffInvite({
      to: email,
      name,
      inviteUrl: inviteUrl(origin, token),
      invitedByEmail: owner!.email,
      expiresInMinutes: INVITE_TTL_MINUTES,
    });
  } catch (error) {
    await prisma.staffInvite.delete({ where: { id: invite.id } });
    fail(error instanceof Error ? `Could not send the email: ${error.message}` : "Could not send the invitation email.");
    return;
  }

  await prisma.auditLog.create({
    data: {
      actorId: owner!.id,
      actorEmail: owner!.email,
      action: "staff_invite.sent",
      entity: "StaffInvite",
      entityId: invite.id,
      diff: { email, name } as Prisma.InputJsonValue,
    },
  });

  revalidatePath(ROLES_PATH);
  redirect(`${ROLES_PATH}?invited=${encodeURIComponent(email)}`);
}

/** Kill a pending invite before it's used. */
export async function cancelStaffInvite(id: string) {
  const owner = await getCurrentStaff();
  assertRole(owner?.role, OWNER_ONLY_ROLES);

  const invite = await prisma.staffInvite.findUnique({ where: { id } });
  if (!invite || invite.acceptedAt) {
    fail("That invitation can no longer be cancelled.");
    return;
  }

  await prisma.staffInvite.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId: owner!.id,
      actorEmail: owner!.email,
      action: "staff_invite.cancelled",
      entity: "StaffInvite",
      entityId: id,
      diff: { email: invite.email } as Prisma.InputJsonValue,
    },
  });

  revalidatePath(ROLES_PATH);
}

/** Re-issue a fresh token + 1-hour window and email the link again. */
export async function resendStaffInvite(id: string) {
  const owner = await getCurrentStaff();
  assertRole(owner?.role, OWNER_ONLY_ROLES);

  const invite = await prisma.staffInvite.findUnique({ where: { id } });
  if (!invite || invite.acceptedAt) {
    fail("That invitation can no longer be resent.");
    return;
  }

  const token = generateInviteToken();
  await prisma.staffInvite.update({
    where: { id },
    data: { tokenHash: hashInviteToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_MS) },
  });

  try {
    const origin = await adminOrigin();
    await sendStaffInvite({
      to: invite.email,
      name: invite.name,
      inviteUrl: inviteUrl(origin, token),
      invitedByEmail: owner!.email,
      expiresInMinutes: INVITE_TTL_MINUTES,
    });
  } catch (error) {
    fail(error instanceof Error ? `Could not send the email: ${error.message}` : "Could not send the invitation email.");
    return;
  }

  await prisma.auditLog.create({
    data: {
      actorId: owner!.id,
      actorEmail: owner!.email,
      action: "staff_invite.resent",
      entity: "StaffInvite",
      entityId: id,
      diff: { email: invite.email } as Prisma.InputJsonValue,
    },
  });

  revalidatePath(ROLES_PATH);
  redirect(`${ROLES_PATH}?invited=${encodeURIComponent(invite.email)}`);
}

/** Promote / demote a staff member. Owner-only; never leaves zero Owners. */
export async function changeStaffRole(formData: FormData) {
  const owner = await getCurrentStaff();
  assertRole(owner?.role, OWNER_ONLY_ROLES);

  const parsed = changeRoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Could not change that role.");
    return;
  }
  const { userId, role } = parsed.data;

  const staff = await listStaffAccounts();
  const target = staff.find((member) => member.id === userId);
  if (!target) {
    fail("That staff member no longer exists.");
    return;
  }
  if (target.role === role) {
    redirect(ROLES_PATH);
  }

  const owners = staff.filter((member) => member.role === "OWNER");
  if (target.role === "OWNER" && role !== "OWNER" && owners.length <= 1) {
    fail("There must be at least one Owner. Make someone else an Owner first.");
    return;
  }

  await setStaffRole(userId, role as Role);
  await prisma.auditLog.create({
    data: {
      actorId: owner!.id,
      actorEmail: owner!.email,
      action: "staff.role_changed",
      entity: "StaffUser",
      entityId: userId,
      diff: { email: target.email, from: target.role, to: role } as Prisma.InputJsonValue,
    },
  });

  revalidatePath(ROLES_PATH);
  redirect(`${ROLES_PATH}?roleChanged=1`);
}

/**
 * Delete a staff member outright — both their sign-in identity and their
 * profile row in the admin auth project (see `deleteStaffAccount`). Owner-only.
 * Refuses to remove the last Owner or the Owner running the action. Safe to
 * run on an account whose auth identity was already deleted by hand in
 * Supabase: it just clears the leftover row.
 */
export async function removeStaff(formData: FormData) {
  const owner = await getCurrentStaff();
  assertRole(owner?.role, OWNER_ONLY_ROLES);

  const parsed = removeStaffSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    fail(parsed.error.issues[0]?.message ?? "Could not remove that staff member.");
    return;
  }
  const { userId } = parsed.data;

  if (userId === owner!.id) {
    fail("You can't remove your own account. Ask another Owner to do it.");
    return;
  }

  const staff = await listStaffAccounts();
  const target = staff.find((member) => member.id === userId);
  if (!target) {
    // Nothing left to remove — treat as done so the stale row clears.
    revalidatePath(ROLES_PATH);
    redirect(`${ROLES_PATH}?staffRemoved=1`);
  }

  const owners = staff.filter((member) => member.role === "OWNER");
  if (target.role === "OWNER" && owners.length <= 1) {
    fail("There must be at least one Owner. Make someone else an Owner first.");
    return;
  }

  await deleteStaffAccount(userId);
  await prisma.auditLog.create({
    data: {
      actorId: owner!.id,
      actorEmail: owner!.email,
      action: "staff.removed",
      entity: "StaffUser",
      entityId: userId,
      diff: { email: target.email, role: target.role, name: target.name } as Prisma.InputJsonValue,
    },
  });

  revalidatePath(ROLES_PATH);
  redirect(`${ROLES_PATH}?staffRemoved=1`);
}
