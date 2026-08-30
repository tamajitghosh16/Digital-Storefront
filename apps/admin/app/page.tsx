import Link from "next/link";
import { prisma } from "@repo/database";
import { cn } from "@repo/ui/utils";
import { PageHeader, Pill } from "@/components/ui";

// FR-11.2/FR-11.3: mirrors the approved back-office mockup — a period
// selector, five headline stats, a weekly revenue chart and a recent-orders
// table — but every number here is a live Prisma query, not sample data.
// The "Everyday jobs" shortcuts below it are this app's own addition: the
// mockup didn't have anywhere to put "what do I actually click", and this
// app's whole audience is a non-technical operator who needs that.

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const moneyExact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const dateFmt = new Intl.DateTimeFormat("en-IN", { weekday: "short", month: "short", day: "numeric" });

type PeriodKey = "today" | "week" | "month" | "year";

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
];

// Anything past PENDING/CANCELLED actually moved money — that's what counts
// as "revenue" and as a completed sale for the conversion-rate stat.
const REVENUE_STATUSES = new Set(["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "READY_FOR_DOWNLOAD"]);

const STATUS_TONE: Record<string, "on" | "off" | "info"> = {
  PAID: "on",
  PROCESSING: "info",
  SHIPPED: "on",
  DELIVERED: "on",
  READY_FOR_DOWNLOAD: "on",
  PENDING: "info",
  CANCELLED: "off",
  REFUNDED: "off",
};

function startOfWeek(): Date {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7; // Sunday=0 → 6, Monday=1 → 0
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - mondayOffset);
}

function periodStart(period: PeriodKey): Date {
  const now = new Date();
  switch (period) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week":
      return startOfWeek();
    case "month":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "year":
      return new Date(now.getFullYear(), 0, 1);
  }
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const { period: periodParam } = await searchParams;
  const period: PeriodKey = PERIODS.some((p) => p.key === periodParam) ? (periodParam as PeriodKey) : "week";

  const start = periodStart(period);
  const weekStart = startOfWeek();

  const [periodOrders, newCustomers, recentOrders, weekOrders, ordersToProcess, pendingSubmissions, pendingServiceRequests] =
    await Promise.all([
      prisma.order.findMany({ where: { createdAt: { gte: start } }, select: { status: true, totalCents: true } }),
      prisma.user.count({ where: { createdAt: { gte: start }, role: { in: ["READER", "SELF_PUB_AUTHOR"] } } }),
      prisma.order.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: { items: true, user: { select: { name: true, email: true } } },
      }),
      prisma.order.findMany({
        where: { createdAt: { gte: weekStart } },
        select: { createdAt: true, totalCents: true, status: true },
      }),
      prisma.order.count({ where: { status: "PAID" } }),
      prisma.selfPublishingProject.count({ where: { status: { in: ["SUBMITTED", "IN_REVIEW"] } } }),
      prisma.serviceRequest.count({ where: { status: "SUBMITTED" } }),
    ]);

  const revenueOrders = periodOrders.filter((o) => REVENUE_STATUSES.has(o.status));
  const totalRevenueCents = revenueOrders.reduce((sum, o) => sum + o.totalCents, 0);
  const orderCount = periodOrders.length;
  const avgOrderCents = revenueOrders.length ? Math.round(totalRevenueCents / revenueOrders.length) : 0;
  const conversionRate = orderCount ? Math.round((revenueOrders.length / orderCount) * 1000) / 10 : 0;

  const stats = [
    { label: "Total revenue", value: money.format(totalRevenueCents / 100) },
    { label: "Orders", value: orderCount.toLocaleString("en-IN") },
    { label: "Avg. order value", value: money.format(avgOrderCents / 100) },
    { label: "New customers", value: newCustomers.toLocaleString("en-IN") },
    { label: "Conversion rate", value: `${conversionRate}%` },
  ];

  const chart = buildWeekChart(weekOrders, weekStart);

  return (
    <div className="max-w-6xl">
      <PageHeader title="Dashboard" description="What needs attention today, and how the shop's doing." />

      {(ordersToProcess > 0 || pendingSubmissions > 0 || pendingServiceRequests > 0) && (
        <div className="-mt-3 mb-6 flex flex-wrap gap-2.5">
          {ordersToProcess > 0 && <AttentionLink href="/orders" count={ordersToProcess} label="orders to process" />}
          {pendingSubmissions > 0 && (
            <AttentionLink href="/submissions" count={pendingSubmissions} label="submissions to review" />
          )}
          {pendingServiceRequests > 0 && (
            <AttentionLink href="/submissions" count={pendingServiceRequests} label="service requests" />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-ink">Overview</h2>
        <div className="flex gap-0.5 rounded-full border border-line-strong p-1">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={p.key === "week" ? "/" : `/?period=${p.key}`}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
                p.key === period ? "bg-ink text-ground" : "text-ink-muted hover:text-ink"
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-tile border border-line-strong bg-ground p-[18px] shadow-tile">
            <p className="mb-2.5 text-[11px] font-medium uppercase tracking-[0.05em] text-ink-muted">{stat.label}</p>
            <p className="font-display text-[22px] font-bold tracking-[-0.01em] tabular-nums text-ink">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-tile border border-line-strong bg-ground p-[22px] shadow-tile">
        <p className="mb-3.5 text-sm font-semibold tracking-[-0.01em] text-ink">Revenue trend — this week</p>
        <WeekChart chart={chart} />
      </div>

      <div className="mt-4 overflow-hidden rounded-tile border border-line-strong bg-ground shadow-tile">
        <p className="px-[22px] py-[18px] text-sm font-semibold tracking-[-0.01em] text-ink">Recent orders</p>
        {recentOrders.length === 0 ? (
          <p className="border-t border-line-strong px-[22px] py-10 text-center text-sm text-ink-muted">
            No orders yet.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[42rem] text-sm">
              <thead className="border-t border-b border-line-strong text-left">
                <tr className="[&>th]:px-[22px] [&>th]:py-2.5 [&>th]:text-xs [&>th]:font-medium [&>th]:whitespace-nowrap [&>th]:text-ink-muted">
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Items</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b [&>tr:not(:last-child)]:border-line [&>tr>td]:px-[22px] [&>tr>td]:py-3 [&>tr>td]:whitespace-nowrap">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="font-medium tabular-nums text-ink-muted">#{order.id.slice(-6).toUpperCase()}</td>
                    <td>{order.user?.name ?? order.user?.email ?? order.guestEmail ?? "Guest"}</td>
                    <td className="text-ink-muted">{dateFmt.format(order.createdAt)}</td>
                    <td>
                      <Pill tone={STATUS_TONE[order.status] ?? "off"}>{order.status}</Pill>
                    </td>
                    <td className="font-semibold tabular-nums">{moneyExact.format(order.totalCents / 100)}</td>
                    <td className="text-ink-muted">{order.items.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <section className="mt-8 rounded-tile border border-line-strong bg-ground p-6">
        <h2 className="font-display text-lg font-bold tracking-[-0.01em] text-ink">Everyday jobs</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Shortcut
            href="/educational-material/books/new"
            title="Add a book"
            body="Printed, e-book, or a service package — with its front cover."
          />
          <Shortcut
            href="/content/banners"
            title="Change the homepage hero"
            body="The big headline and buttons at the top of the site."
          />
          <Shortcut
            href="/content/homepage"
            title="Change homepage wording"
            body="Every other heading and description on the homepage."
          />
          <Shortcut
            href="/settings/pricing"
            title="Pricing & delivery"
            body="Postage, bulk discounts, GST, and discount codes."
          />
          <Shortcut href="/content/faqs" title="Questions & answers" body="What appears in the FAQ section." />
          <Shortcut
            href="/settings/site"
            title="Site details"
            body="Shop name, logo, contact details and social links."
          />
        </div>
      </section>
    </div>
  );
}

function AttentionLink({ href, count, label }: { href: string; count: number; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-ground px-3.5 py-1.5 text-[13px] font-medium text-ink transition-colors hover:bg-tile"
    >
      <span className="grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[11px] font-bold text-ground">
        {count}
      </span>
      {label}
    </Link>
  );
}

function Shortcut({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link
      href={href}
      className="rounded-btn border border-line bg-tile-3 p-4 transition-colors hover:border-brand hover:bg-brand-soft"
    >
      <p className="text-sm font-bold text-ink">{title} →</p>
      <p className="mt-1 text-[13px] leading-snug text-ink-muted">{body}</p>
    </Link>
  );
}

// ── Revenue trend chart ────────────────────────────────────────────────
// Same construction as the mockup's SVG: a 600×190 viewBox, a 7-point
// line with area fill, scaled between this week's min and max daily
// revenue (not zero-based — a flat week should still show as a line, not
// a bar chart hugging the bottom).

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface ChartPoint {
  x: number;
  y: number;
  day: string;
  value: number;
}

interface WeekChartData {
  points: ChartPoint[];
  pointsAttr: string;
  areaPath: string;
  baselineY: number;
}

function buildWeekChart(orders: { createdAt: Date; totalCents: number; status: string }[], weekStart: Date): WeekChartData {
  const totals = new Array(7).fill(0) as number[];
  for (const order of orders) {
    if (!REVENUE_STATUSES.has(order.status)) continue;
    const dayIndex = Math.floor((order.createdAt.getTime() - weekStart.getTime()) / 86_400_000);
    if (dayIndex >= 0 && dayIndex < 7) totals[dayIndex] = (totals[dayIndex] ?? 0) + order.totalCents / 100;
  }

  const width = 600;
  const height = 190;
  const padX = 24;
  const padTop = 16;
  const padBottom = 40;
  const plotWidth = width - padX * 2;
  const plotHeight = height - padTop - padBottom;
  const max = Math.max(...totals);
  const min = Math.min(...totals);
  const baselineY = padTop + plotHeight;

  const points: ChartPoint[] = totals.map((value, i) => {
    const x = +(padX + i * (plotWidth / (totals.length - 1))).toFixed(1);
    const y = +(padTop + plotHeight - ((value - min) / (max - min || 1)) * plotHeight).toFixed(1);
    return { x, y, day: WEEKDAY_LABELS[i]!, value };
  });

  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(" ");
  const areaPath =
    `M${points[0]!.x},${baselineY} ` +
    points.map((p) => `L ${p.x} ${p.y}`).join(" ") +
    ` L ${points[points.length - 1]!.x},${baselineY} Z`;

  return { points, pointsAttr, areaPath, baselineY };
}

function WeekChart({ chart }: { chart: WeekChartData }) {
  return (
    <svg viewBox="0 0 600 190" className="block h-[190px] w-full" role="img" aria-label="Revenue trend, this week">
      <line x1="24" y1="31" x2="576" y2="31" className="stroke-line-strong" strokeWidth="1" strokeDasharray="2,4" />
      <line x1="24" y1="79" x2="576" y2="79" className="stroke-line-strong" strokeWidth="1" strokeDasharray="2,4" />
      <line x1="24" y1="127" x2="576" y2="127" className="stroke-line-strong" strokeWidth="1" strokeDasharray="2,4" />
      <path d={chart.areaPath} className="fill-brand-soft" stroke="none" />
      <polyline points={chart.pointsAttr} fill="none" className="stroke-ink" strokeWidth="2.5" />
      {chart.points.map((p) => (
        <g key={p.day}>
          <circle cx={p.x} cy={p.y} r="3.5" className="fill-ink" />
          <text x={p.x} y={chart.baselineY + 22} textAnchor="middle" fontSize="11" className="fill-ink-muted">
            {p.day}
          </text>
        </g>
      ))}
    </svg>
  );
}
