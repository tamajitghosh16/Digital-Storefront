import {
  REDEEMED_ORDER_STATUSES,
  describeDiscount,
  discountStatus,
  formatDiscountRupees,
  prisma,
  type DiscountStatus,
} from "@repo/database";
import { ErrorBanner, PageHeader, Pill, SavedBanner, Section, Table } from "@/components/ui";
import { ConfirmButton, LinkButton } from "@/components/form-controls";
import { requireStaffPage } from "@/lib/guard";
import { AddDiscountDialog } from "./add-discount-dialog";
import { deleteDiscountCode, toggleDiscountCode } from "./actions";

// Every checkout discount code: the ones working right now first, then the
// rest (switched off, not started, expired, used up) so they can be turned
// back on or deleted.

const day = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const STATUS_LABEL: Record<DiscountStatus, string> = {
  ACTIVE: "Working",
  SCHEDULED: "Not started yet",
  EXPIRED: "Ended",
  USED_UP: "All uses taken",
  OFF: "Off",
};

export default async function DiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  await requireStaffPage();
  const { error, created } = await searchParams;

  const [codes, usage] = await Promise.all([
    prisma.discountCode.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.order.groupBy({
      by: ["discountCodeId"],
      where: { discountCodeId: { not: null }, status: { in: [...REDEEMED_ORDER_STATUSES] } },
      _count: { _all: true },
      _sum: { discountCents: true },
    }),
  ]);

  const usageById = new Map(
    usage.map((row) => [row.discountCodeId, { uses: row._count._all, savedCents: row._sum.discountCents ?? 0 }])
  );
  const now = new Date();
  const rows = codes.map((code) => {
    const used = usageById.get(code.id) ?? { uses: 0, savedCents: 0 };
    return { code, used, status: discountStatus(code, now, used.uses) };
  });
  const active = rows.filter((row) => row.status === "ACTIVE");
  const others = rows.filter((row) => row.status !== "ACTIVE");

  return (
    <div className="max-w-6xl space-y-6">
      <PageHeader
        title="Discount"
        description="Coupon codes shoppers can type in their cart. A code takes money off the items (not delivery), and the storefront checks every rule again when the order is placed."
        action={<AddDiscountDialog />}
      />

      <ErrorBanner message={error} />
      {created && <SavedBanner message={`Coupon ${created} added.`} />}

      <Section
        title="Currently active coupons"
        description="Codes that work at checkout right now."
      >
        {active.length > 0 ? (
          <CodeTable rows={active} />
        ) : (
          <p className="text-sm text-ink-muted">No coupon is working right now. Use “Add new Coupon” to create one.</p>
        )}
      </Section>

      {others.length > 0 && (
        <Section
          title="Other coupons"
          description="Switched off, not started yet, ended, or out of uses. Shoppers who type these are told the code isn't valid."
        >
          <CodeTable rows={others} />
        </Section>
      )}
    </div>
  );
}

type Row = {
  code: Awaited<ReturnType<typeof prisma.discountCode.findMany>>[number];
  used: { uses: number; savedCents: number };
  status: DiscountStatus;
};

function CodeTable({ rows }: { rows: Row[] }) {
  return (
    <Table
      head={
        <>
          <th>Code</th>
          <th>Discount</th>
          <th>Conditions</th>
          <th>Valid</th>
          <th>Used</th>
          <th>Status</th>
          <th className="text-right">&nbsp;</th>
        </>
      }
    >
      {rows.map(({ code, used, status }) => (
        <tr key={code.id}>
          <td>
            <span className="font-mono text-sm font-bold">{code.code}</span>
            {code.blurb && <span className="mt-0.5 block text-[13px] text-ink-muted">{code.blurb}</span>}
            {code.internalNote && (
              <span className="mt-0.5 block text-[12px] italic text-ink-subtle">Note: {code.internalNote}</span>
            )}
          </td>
          <td className="whitespace-nowrap">{describeDiscount(code)}</td>
          <td className="text-[13px] text-ink-muted">
            {code.minOrderCents > 0 ? `Orders of ${formatDiscountRupees(code.minOrderCents)}+` : "Any order"}
            {code.perCustomerLimit !== null && (
              <span className="block">
                {code.perCustomerLimit === 1 ? "Once per customer" : `${code.perCustomerLimit}× per customer`}
              </span>
            )}
          </td>
          <td className="whitespace-nowrap text-[13px] text-ink-muted">
            {code.startsAt || code.expiresAt ? (
              <>
                {code.startsAt ? day.format(code.startsAt) : "Now"} – {code.expiresAt ? day.format(code.expiresAt) : "no end"}
              </>
            ) : (
              "Always"
            )}
          </td>
          <td className="whitespace-nowrap tabular-nums">
            {used.uses}
            {code.usageLimit !== null && ` / ${code.usageLimit}`}
            {used.savedCents > 0 && (
              <span className="block text-[12px] text-ink-muted">{formatDiscountRupees(used.savedCents)} saved</span>
            )}
          </td>
          <td>
            <Pill tone={status === "ACTIVE" ? "on" : status === "SCHEDULED" ? "info" : "off"}>{STATUS_LABEL[status]}</Pill>
          </td>
          <td className="space-x-4 whitespace-nowrap text-right">
            <form action={toggleDiscountCode.bind(null, code.id)} className="inline">
              <LinkButton>{code.isActive ? "Turn off" : "Turn on"}</LinkButton>
            </form>
            <form action={deleteDiscountCode.bind(null, code.id)} className="inline">
              <ConfirmButton
                message={`Delete the code ${code.code}? Shoppers using it will stop getting the discount. Past orders keep their discount.`}
              >
                Delete
              </ConfirmButton>
            </form>
          </td>
        </tr>
      ))}
    </Table>
  );
}
