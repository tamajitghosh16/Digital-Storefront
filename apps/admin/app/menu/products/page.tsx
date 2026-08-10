import { prisma } from "@repo/database";
import { EmptyState, PageHeader, Pill, SavedBanner, Table } from "@/components/ui";
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
        description="Products show up in their category's dropdown. Editing and reordering existing products isn't available yet — this only adds new ones."
      />

      {created && <SavedBanner message="Product added." />}
      <MenuProductForm action={createMenuProduct} categories={categories} error={error} />

      <div>
        <h2 className="mb-3 font-display text-base font-bold text-ink">Products on the menu</h2>
        {products.length === 0 ? (
          <EmptyState title="No products yet" description="Add one above to see it here." />
        ) : (
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
        )}
      </div>
    </div>
  );
}
