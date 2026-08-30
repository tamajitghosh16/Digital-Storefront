import { prisma } from "@repo/database";
import { PageHeader, Pill, SavedBanner, Table } from "@/components/ui";
import { FIXED_DEPARTMENTS } from "../fixed-departments";
import { createMenuProduct } from "./actions";
import { MenuProductForm } from "./product-form";

export default async function MenuProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error, created } = await searchParams;
  const [categories, products] = await Promise.all([
    prisma.menuCategory.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.menuProduct.findMany({ orderBy: { order: "asc" }, include: { category: true } }),
  ]);

  return (
    <div className="max-w-5xl space-y-10">
      <PageHeader
        title="Add a product"
        description="Products show up in their category's dropdown on the storefront menu. The list below is every product on that menu today — the built-in ones plus any you've added. Editing and reordering existing products isn't available yet — this only adds new ones."
      />

      {created && <SavedBanner message="Product added." />}
      <MenuProductForm action={createMenuProduct} categories={categories} error={error} />

      <div>
        <h2 className="mb-3 font-display text-base font-bold text-ink">Products on the menu</h2>
        <Table
          head={
            <>
              <th>Name</th>
              <th>Category</th>
              <th>Page</th>
              <th>Status</th>
            </>
          }
        >
          {FIXED_DEPARTMENTS.flatMap((department) =>
            department.products.map((product) => (
              <tr key={`${department.label}:${product.href}`}>
                <td className="font-semibold text-ink">{product.label}</td>
                <td className="text-ink-muted">{department.label}</td>
                <td className="font-mono text-[13px] text-ink-muted">{product.href}</td>
                <td>
                  <Pill tone="info">Built in</Pill>
                </td>
              </tr>
            ))
          )}
          {products.map((product) => (
            <tr key={product.id}>
              <td className="font-semibold text-ink">{product.name}</td>
              <td className="text-ink-muted">{product.category.name}</td>
              <td className="font-mono text-[13px] text-ink-muted">/{product.slug}</td>
              <td>
                <Pill tone={product.isActive ? "on" : "off"}>{product.isActive ? "Showing" : "Hidden"}</Pill>
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
