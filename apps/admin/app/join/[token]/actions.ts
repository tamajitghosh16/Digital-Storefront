"use server";

import { redirect } from "next/navigation";
import { prisma, type Prisma } from "@repo/database";
import { createStaffAuthUser } from "@repo/auth/server";
import { hashInviteToken } from "@/lib/staff-invites";
import { staffSignUpSchema } from "./schema";

const back = (token: string, message: string) =>
  redirect(`/join/${token}?error=${encodeURIComponent(message)}`);

/**
 * Redeem a staff invite: validate the token again (it was already checked on
 * page load, but a Server Action can't trust that), create the auth identity
 * in the admin auth project, and burn the invite. The new account lands as
 * READER — an Owner promotes it from Staff & roles.
 */
export async function acceptStaffInvite(token: string, formData: FormData) {
  const parsed = staffSignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    back(token, parsed.error.issues[0]?.message ?? "Please check the form and try again.");
  }

  const invite = await prisma.staffInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    back(token, "This invite link is no longer valid. Ask for a new one.");
    return;
  }

  let userId: string;
  try {
    ({ userId } = await createStaffAuthUser({
      email: invite.email,
      password: parsed.data!.password,
      name: invite.name,
    }));
  } catch (error) {
    back(token, error instanceof Error ? error.message : "Could not create your account.");
    return;
  }

  await prisma.staffInvite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorEmail: invite.email,
      action: "staff_invite.accepted",
      entity: "StaffInvite",
      entityId: invite.id,
      diff: { email: invite.email, name: invite.name } as Prisma.InputJsonValue,
    },
  });

  redirect("/sign-in?welcome=1");
}
