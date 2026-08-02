"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CONTENT_ENTRIES, prisma, type Prisma } from "@repo/database";
import { getCurrentUser } from "@repo/auth/server";
import { assertRole, CONTENT_WRITE_ROLES } from "@repo/auth/roles";

/**
 * Save every homepage copy field in one go.
 *
 * The form posts all keys at once because they're edited as one screen, and
 * because the alternative — a save button per field — would make changing a
 * whole section a dozen round-trips.
 *
 * A field left equal to (or emptied back to) the shipped default has its row
 * *deleted* rather than stored. That keeps "revert to default" a thing the
 * Publisher can do by clearing a box, and means a future copy change in a
 * release reaches anyone who never overrode that field.
 */
export async function updateHomepageContent(formData: FormData) {
  const user = await getCurrentUser();
  assertRole(user?.role, CONTENT_WRITE_ROLES);

  const overrides: { key: string; value: string }[] = [];
  const cleared: string[] = [];

  for (const entry of CONTENT_ENTRIES) {
    const raw = formData.get(entry.key);
    // A key missing from the payload means the form didn't render it —
    // leave whatever is stored alone rather than wiping it.
    if (typeof raw !== "string") continue;

    const value = raw.trim();
    if (!value || value === entry.defaultValue.trim()) cleared.push(entry.key);
    else overrides.push({ key: entry.key, value });
  }

  await prisma.$transaction([
    prisma.contentBlock.deleteMany({ where: { key: { in: cleared } } }),
    ...overrides.map((override) =>
      prisma.contentBlock.upsert({
        where: { key: override.key },
        update: { value: override.value },
        create: override,
      })
    ),
  ]);

  await prisma.auditLog.create({
    data: {
      actorId: user!.id,
      action: "content.updated",
      entity: "ContentBlock",
      entityId: "homepage",
      diff: { overridden: overrides.map((o) => o.key), reset: cleared } as Prisma.InputJsonValue,
    },
  });

  revalidatePath("/content/homepage");
  redirect("/content/homepage?saved=1");
}
