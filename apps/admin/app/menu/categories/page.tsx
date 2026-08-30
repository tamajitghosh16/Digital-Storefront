import { prisma } from "@repo/database";
import { PageHeader, Pill, SavedBanner, Table } from "@/components/ui";
import { FIXED_DEPARTMENTS } from "../fixed-departments";
import { createMenuCategory } from "./actions";
import { CategoryForm } from "./category-form";

export default async function MenuCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error, created } = await searchParams;
  const categories = await prisma.menuCategory.findMany({
    orderBy: { order: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div className="max-w-5xl space-y-10">
      <PageHeader
        title="Add a category"
        description="Categories show up on the storefront's top menu. The list below is every category on that menu today — the five built-in departments plus any you've added. Editing and reordering existing categories isn't available yet — this only adds new ones."
      />

      {created && <SavedBanner message="Category added." />}
      <CategoryForm action={createMenuCategory} error={error} />

      <div>
        <h2 className="mb-3 font-display text-base font-bold text-ink">Categories on the menu</h2>
        <Table
          head={
            <>
              <th>Name</th>
              <th>Page</th>
              <th>Products</th>
              <th>Status</th>
            </>
          }
        >
          {FIXED_DEPARTMENTS.map((department) => (
            <tr key={department.label}>
              <td className="font-semibold text-ink">{department.label}</td>
              <td className="font-mono text-[13px] text-ink-muted">{department.href}</td>
              <td className="tabular-nums text-ink-muted">{department.products.length}</td>
              <td>
                <Pill tone="info">Built in</Pill>
              </td>
            </tr>
          ))}
          {categories.map((category) => (
            <tr key={category.id}>
              <td className="font-semibold text-ink">{category.name}</td>
              <td className="font-mono text-[13px] text-ink-muted">/{category.slug}</td>
              <td className="tabular-nums text-ink-muted">{category._count.products}</td>
              <td>
                <Pill tone={category.isActive ? "on" : "off"}>{category.isActive ? "Showing" : "Hidden"}</Pill>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
