import "server-only";
import { getSiteSettings, prisma, type MenuCategory, type MenuProduct, type OrderStatus } from "@repo/database";
import { cachedQuery } from "@repo/cache/query";
import { TTL } from "@repo/cache/policy";
import { cmsEntryTags } from "@repo/cache/tags";

/**
 * The back office's own cached reads (docs/adr/0001-caching-strategy.md).
 *
 * Admin is one low-traffic process on Next's built-in cache. Only two kinds
 * of read are cached here, and nothing an operator acts on:
 *
 *  - The chrome every page draws (site name, Products Menu sidebar), tagged
 *    like the storefront's copies (`cms:settings`, `cms:menu`). Every admin
 *    save to them expires these tags here at once (`revalidateStorefront()`
 *    in lib/storefront-cache.ts), so an operator always sees their own
 *    change.
 *  - The dashboard and analytics aggregates, tagged `admin:order-stats`,
 *    for `TTL.adminStats` (a minute). Sales-order moves here expire them at
 *    once; a new storefront order shows within the minute, as the dashboard
 *    says.
 *
 * Never cached: the staff session and role (`getCurrentStaff()`, checked
 * fresh on every request so a demotion applies at once), the orders queues,
 * and the dashboard's "needs attention" counts and recent orders.
 */

export const ORDER_STATS_TAG = "admin:order-stats";

/** Anything past PENDING/CANCELLED actually moved money — "revenue", and a completed sale for the conversion rate. */
export const REVENUE_STATUSES = [
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "READY_FOR_DOWNLOAD",
] as const satisfies readonly OrderStatus[];

const REVENUE_STATUS_SET: ReadonlySet<string> = new Set(REVENUE_STATUSES);
const DAY_MS = 86_400_000;

// ---------------------------------------------------------------------------
// Chrome
// ---------------------------------------------------------------------------

/** The site's name for the sidebar header. Throws on a database error. */
export const getChromeSiteName = cachedQuery(
  { name: "admin:site-name", ttl: TTL.cms, tags: cmsEntryTags("settings") },
  async () => (await getSiteSettings()).siteName
);

type InventoryCategory = MenuCategory & { products: MenuProduct[] };

function reviveTimestamps<T extends { createdAt: Date; updatedAt: Date }>(row: T): T {
  return { ...row, createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) };
}

/** Active Products Menu categories with their active products, for the sidebar. Throws on a database error. */
export const getChromeMenu = cachedQuery(
  {
    name: "admin:menu",
    ttl: TTL.cms,
    tags: cmsEntryTags("menu"),
    revive: (categories: InventoryCategory[]) =>
      categories.map((category) => ({ ...reviveTimestamps(category), products: category.products.map(reviveTimestamps) })),
  },
  (): Promise<InventoryCategory[]> =>
    prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: { products: { where: { isActive: true }, orderBy: { order: "asc" } } },
    })
);

// ---------------------------------------------------------------------------
// Order statistics
// ---------------------------------------------------------------------------

export interface PeriodStats {
  revenueCents: number;
  orderCount: number;
  /** Orders that moved money (REVENUE_STATUSES). */
  revenueOrderCount: number;
  newCustomers: number;
}

type StatusRow = { status: string; _sum: { totalCents: number | null }; _count: { _all: number } };

/** Folds per-status totals into the dashboard's headline figures. */
export function summariseByStatus(rows: readonly StatusRow[]): Omit<PeriodStats, "newCustomers"> {
  let revenueCents = 0;
  let orderCount = 0;
  let revenueOrderCount = 0;
  for (const row of rows) {
    orderCount += row._count._all;
    if (!REVENUE_STATUS_SET.has(row.status)) continue;
    revenueCents += row._sum.totalCents ?? 0;
    revenueOrderCount += row._count._all;
  }
  return { revenueCents, orderCount, revenueOrderCount };
}

/**
 * Headline figures for orders placed since `start`: one grouped aggregate
 * in the database rather than every order of the period summed in JS (a
 * year's orders used to come back row by row).
 */
export async function loadPeriodStats(start: Date): Promise<PeriodStats> {
  const [byStatus, newCustomers] = await Promise.all([
    prisma.order.groupBy({
      by: ["status"],
      where: { createdAt: { gte: start } },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    prisma.user.count({ where: { createdAt: { gte: start }, role: { in: ["READER", "SELF_PUB_AUTHOR"] } } }),
  ]);
  return { ...summariseByStatus(byStatus), newCustomers };
}

/**
 * Revenue (in rupees) for each of the 7 days from `weekStart`, where day N
 * is the 24 hours starting N days after it — the same buckets the chart
 * always drew. One small aggregate per day, run together.
 */
export async function loadWeekRevenue(weekStart: Date): Promise<number[]> {
  const from = weekStart.getTime();
  return Promise.all(
    Array.from({ length: 7 }, async (_, day) => {
      const { _sum } = await prisma.order.aggregate({
        where: {
          createdAt: { gte: new Date(from + day * DAY_MS), lt: new Date(from + (day + 1) * DAY_MS) },
          status: { in: [...REVENUE_STATUSES] },
        },
        _sum: { totalCents: true },
      });
      return (_sum.totalCents ?? 0) / 100;
    })
  );
}

/** Cached {@link loadPeriodStats}; `start` as an ISO string, so it keys the cache. */
export const getPeriodStats = cachedQuery(
  { name: "admin:period-stats", ttl: TTL.adminStats, tags: [ORDER_STATS_TAG] },
  (startIso: string) => loadPeriodStats(new Date(startIso))
);

/** Cached {@link loadWeekRevenue}; `weekStart` as an ISO string. */
export const getWeekRevenue = cachedQuery(
  { name: "admin:week-revenue", ttl: TTL.adminStats, tags: [ORDER_STATS_TAG] },
  (weekStartIso: string) => loadWeekRevenue(new Date(weekStartIso))
);

/** Money and order count per order status, all time (the Analytics page). */
export const getRevenueByStatus = cachedQuery(
  { name: "admin:revenue-by-status", ttl: TTL.adminStats, tags: [ORDER_STATS_TAG] },
  () =>
    prisma.order.groupBy({
      by: ["status"],
      _sum: { totalCents: true },
      _count: { _all: true },
    })
);
