import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma, type OrderStatus } from "@repo/database";
import { resetTestDatabase, testDatabaseUrl } from "@repo/database/testing";

// The dashboard's figures (lib/admin-cache.ts) are now grouped aggregates
// in the database rather than every order summed in JS. Against real rows,
// they must come out exactly as the old row-by-row sums did.

vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn, revalidateTag: vi.fn() }));

const { REVENUE_STATUSES, loadPeriodStats, loadWeekRevenue } = await import("@/lib/admin-cache");

const DAY = 86_400_000;
const weekStart = new Date("2026-11-09T00:00:00Z"); // a Monday

async function order(status: OrderStatus, totalCents: number, createdAt: Date) {
  await prisma.order.create({ data: { status, subtotalCents: totalCents, totalCents, createdAt } });
}

/** The dashboard's previous arithmetic, verbatim in spirit: fetch every row, sum in JS. */
async function oldStyle(start: Date) {
  const revenue = new Set<string>(REVENUE_STATUSES);
  const rows = await prisma.order.findMany({ where: { createdAt: { gte: start } }, select: { status: true, totalCents: true, createdAt: true } });
  const paid = rows.filter((row) => revenue.has(row.status));
  const week = new Array(7).fill(0) as number[];
  for (const row of paid) {
    const day = Math.floor((row.createdAt.getTime() - weekStart.getTime()) / DAY);
    if (day >= 0 && day < 7) week[day] = (week[day] ?? 0) + row.totalCents / 100;
  }
  return {
    revenueCents: paid.reduce((sum, row) => sum + row.totalCents, 0),
    orderCount: rows.length,
    revenueOrderCount: paid.length,
    week,
  };
}

describe.skipIf(!testDatabaseUrl())("dashboard order statistics", () => {
  beforeEach(() => resetTestDatabase(prisma));
  afterAll(() => prisma.$disconnect());

  it("match the old row-by-row sums, including day boundaries and non-revenue orders", async () => {
    await order("PAID", 120_00, new Date(weekStart.getTime() + 1_000)); // Monday, just after midnight
    await order("DELIVERED", 450_50, new Date(weekStart.getTime() + DAY - 1)); // Monday, last millisecond
    await order("PROCESSING", 99_00, new Date(weekStart.getTime() + DAY)); // Tuesday, first millisecond
    await order("PENDING", 5_000_00, new Date(weekStart.getTime() + 2 * DAY)); // not revenue
    await order("CANCELLED", 70_00, new Date(weekStart.getTime() + 3 * DAY)); // not revenue
    await order("READY_FOR_DOWNLOAD", 300_00, new Date(weekStart.getTime() + 6 * DAY + 5)); // Sunday
    await order("PAID", 1_000_00, new Date(weekStart.getTime() - DAY)); // the week before
    await order("SHIPPED", 10_00, new Date(weekStart.getTime() + 7 * DAY)); // the week after

    const expected = await oldStyle(weekStart);
    const stats = await loadPeriodStats(weekStart);
    const week = await loadWeekRevenue(weekStart);

    expect({
      revenueCents: stats.revenueCents,
      orderCount: stats.orderCount,
      revenueOrderCount: stats.revenueOrderCount,
    }).toEqual({
      revenueCents: expected.revenueCents,
      orderCount: expected.orderCount,
      revenueOrderCount: expected.revenueOrderCount,
    });
    expect(week).toEqual(expected.week);
    expect(week).toEqual([570.5, 99, 0, 0, 0, 0, 300]);
  });

  it("is all zeros with no orders", async () => {
    expect(await loadPeriodStats(weekStart)).toEqual({ revenueCents: 0, orderCount: 0, revenueOrderCount: 0, newCustomers: 0 });
    expect(await loadWeekRevenue(weekStart)).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});
