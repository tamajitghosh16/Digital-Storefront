import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@repo/database";
import { resetTestDatabase, testDatabaseUrl } from "@repo/database/testing";

// The discount-code Server Actions (app/discounts/actions.ts) against a real
// database: the role gate, the write, and the audit trail. The staff session
// and Next's redirect/revalidate are stubbed — they need a live request.

const staff = vi.hoisted(() => ({ current: null as null | { id: string; email: string; role: string } }));
vi.mock("@repo/auth/server", () => ({ getCurrentStaff: async () => staff.current }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));

const { createDiscountCode, toggleDiscountCode } = await import("@/app/discounts/actions");

const editor = { id: randomUUID(), email: "editor@example.test", role: "EDITOR" };
const support = { id: randomUUID(), email: "support@example.test", role: "SUPPORT" };

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

/** Runs an action that ends in redirect(), returning where it sent the editor. */
async function redirectOf(action: Promise<unknown>): Promise<string> {
  const error = await action.then(
    () => null,
    (e: unknown) => e
  );
  expect(error).toMatchObject({ message: "NEXT_REDIRECT" });
  return (error as { url: string }).url;
}

const term10 = { code: "term10", type: "PERCENT", value: "10", isActive: "on" };

describe.skipIf(!testDatabaseUrl())("discount code actions", () => {
  beforeEach(async () => {
    await resetTestDatabase(prisma);
    staff.current = editor;
  });
  afterAll(() => prisma.$disconnect());

  it("creates a code, upper-cased, and records who did it", async () => {
    const url = await redirectOf(createDiscountCode(form(term10)));

    expect(url).toBe("/discounts?created=TERM10");
    const code = await prisma.discountCode.findUniqueOrThrow({ where: { code: "TERM10" } });
    expect(code).toMatchObject({ type: "PERCENT", rateBps: 1000, isActive: true });
    expect(await prisma.auditLog.findMany({ where: { entityId: code.id } })).toEqual([
      expect.objectContaining({ action: "discount_code.created", actorId: editor.id, actorEmail: editor.email }),
    ]);
  });

  it("refuses a duplicate code", async () => {
    await redirectOf(createDiscountCode(form(term10)));

    const url = await redirectOf(createDiscountCode(form({ ...term10, code: "TERM10" })));

    expect(decodeURIComponent(url)).toContain("The code TERM10 already exists.");
    expect(await prisma.discountCode.count()).toBe(1);
  });

  it("bounces invalid input back to the form without writing", async () => {
    const url = await redirectOf(createDiscountCode(form({ ...term10, value: "150" })));

    expect(decodeURIComponent(url)).toContain("can't be more than 100%");
    expect(await prisma.discountCode.count()).toBe(0);
  });

  it("refuses staff without catalogue rights, before touching the database", async () => {
    staff.current = support;

    await expect(createDiscountCode(form(term10))).rejects.toThrow(/Forbidden/);
    expect(await prisma.discountCode.count()).toBe(0);
    expect(await prisma.auditLog.count()).toBe(0);
  });

  it("refuses a signed-out caller", async () => {
    staff.current = null;

    await expect(createDiscountCode(form(term10))).rejects.toThrow(/Forbidden/);
  });

  it("turns a code off and logs it", async () => {
    await redirectOf(createDiscountCode(form(term10)));
    const { id } = await prisma.discountCode.findUniqueOrThrow({ where: { code: "TERM10" } });

    await toggleDiscountCode(id);

    expect(await prisma.discountCode.findUniqueOrThrow({ where: { id } })).toMatchObject({ isActive: false });
    expect(await prisma.auditLog.count({ where: { action: "discount_code.turned_off" } })).toBe(1);
  });
});
