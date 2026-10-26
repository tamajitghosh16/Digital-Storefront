"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma, type Prisma } from "@repo/database";
import { createStaffAuthUser } from "@repo/auth/server";
import { securityEvent } from "@repo/security/log";
import { RATE_LIMITS, clientIp, rateLimit } from "@repo/security/rate-limit";
import { hashInviteToken } from "@/lib/staff-invites";
import { staffSignUpSchema } from "./schema";

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,100}$/;

const back = (token: string, message: string) =>
  redirect(`/join/${encodeURIComponent(token)}?error=${encodeURIComponent(message)}`);

/**
 * Redeem a staff invite: validate the token again (it was already checked on
 * page load, but a Server Action can't trust that), create the auth identity
 * in the admin auth project, and burn the invite. The new account lands as
 * READER — an Owner promotes it from Staff & roles.
 *
 * The invite is *claimed* with a conditional update before the account is
 * created, so two simultaneous submissions can't both redeem one link; if
 * account creation then fails, the claim is released so the person can retry.
 */
export async function acceptStaffInvite(token: string, formData: FormData) {
  if (typeof token !== "string" || !TOKEN_SHAPE.test(token)) redirect("/sign-in");

  if (!(await rateLimit(RATE_LIMITS.staffInviteAccept, clientIp(await headers()))).ok) {
    back(token, "Too many attempts. Please wait 15 minutes and try again.");
  }

  const parsed = staffSignUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    back(token, parsed.error.issues[0]?.message ?? "Please check the form and try again.");
  }

  const tokenHash = hashInviteToken(token);
  const claimedAt = new Date();
  const claim = await prisma.staffInvite.updateMany({
    where: { tokenHash, acceptedAt: null, expiresAt: { gt: claimedAt } },
    data: { acceptedAt: claimedAt },
  });
  if (claim.count !== 1) {
    securityEvent("staff_invite.invalid_token", { ip: clientIp(await headers()) });
    back(token, "This invite link is no longer valid. Ask for a new one.");
    return;
  }
  const invite = await prisma.staffInvite.findUniqueOrThrow({ where: { tokenHash } });

  let userId: string;
  try {
    ({ userId } = await createStaffAuthUser({
      email: invite.email,
      password: parsed.data!.password,
      name: invite.name,
    }));
  } catch (error) {
    // Release the claim so the link still works for a retry.
    await prisma.staffInvite.updateMany({
      where: { id: invite.id, acceptedAt: claimedAt },
      data: { acceptedAt: null },
    });
    console.error("[join] createStaffAuthUser failed", error);
    const message = error instanceof Error ? error.message : "";
    back(
      token,
      /password/i.test(message)
        ? "That password was rejected — it may be too common or appear in a known data breach. Choose another."
        : /already (been )?registered|exists/i.test(message)
          ? "An account for this email already exists. Sign in instead, or ask the Publisher for help."
          : "Could not create your account. Please try again, or ask for a new invite."
    );
    return;
  }

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
