import { prisma } from "@repo/database";
import { ErrorBanner, PageHeader, SavedBanner, Table } from "@/components/ui";
import { FIXED_DEPARTMENTS } from "../fixed-departments";
import { AddCategoryDialog } from "./add-category-dialog";
import { setDepartmentVisibility, setMenuCategoryVisibility } from "./actions";
import { VisibilitySwitch } from "./visibility-switch";

export default async function MenuCategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; visibility?: string }>;
}) {
  const { error, created, visibility } = await searchParams;
  const [categories, hiddenDepartments] = await Promise.all([
    prisma.menuCategory.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { products: true } } },
    }),
    prisma.departmentVisibility.findMany({ where: { hidden: true } }),
  ]);
  const hiddenKeys = new Set(hiddenDepartments.map((row) => row.key));

  return (
    <div className="max-w-5xl space-y-8">
      <PageHeader
        title="Menu categories"
        description="Every category on the storefront's top menu — the five built-in departments plus any you've added. Use the switch in the Status column to show or hide a category on the storefront. Editing and reordering existing categories isn't available yet."
        action={<AddCategoryDialog />}
      />

      {created && <SavedBanner message="Category added." />}
      {visibility && <SavedBanner message="Storefront menu updated." />}
      {error && <ErrorBanner message={error} />}

      <div>
        <h2 className="mb-3 font-display text-base font-bold text-ink">Categories on the menu</h2>
        <Table
          head={
            <>
              <th>Name</th>
              <th>Products</th>
              <th>Status</th>
            </>
          }
        >
          {FIXED_DEPARTMENTS.map((department) => {
            const shown = !hiddenKeys.has(department.key);
            return (
              <tr key={department.key}>
                <td className="font-semibold text-ink">{department.label}</td>
                <td className="tabular-nums text-ink-muted">{department.products.length}</td>
                <td>
                  <form action={setDepartmentVisibility.bind(null, department.key)}>
                    <VisibilitySwitch shown={shown} />
                  </form>
                </td>
              </tr>
            );
          })}
          {categories.map((category) => (
            <tr key={category.id}>
              <td className="font-semibold text-ink">{category.name}</td>
              <td className="tabular-nums text-ink-muted">{category._count.products}</td>
              <td>
                <form action={setMenuCategoryVisibility.bind(null, category.id)}>
                  <VisibilitySwitch shown={category.isActive} />
                </form>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
