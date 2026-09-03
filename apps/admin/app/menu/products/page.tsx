import { prisma } from "@repo/database";
import { PageHeader, SavedBanner, Table } from "@/components/ui";
import { FIXED_DEPARTMENTS } from "../fixed-departments";
import { AddProductDialog } from "./add-product-dialog";
import { BuiltInSwitch, VisibilityToggle } from "./visibility-toggle";

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
        title="Products"
        description="Every product on the storefront menu — the built-in ones plus any you've added. Use “Add new Product” to add one, and the Status switch to show or hide it on the storefront."
        action={<AddProductDialog categories={categories} error={error} />}
      />

      {created && <SavedBanner message="Product added." />}

      <div>
        <h2 className="mb-3 font-display text-base font-bold text-ink">Products on the menu</h2>
        <Table
          head={
            <>
              <th>Name</th>
              <th>Category</th>
              <th>Page Route</th>
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
                  <BuiltInSwitch />
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
                <VisibilityToggle productId={product.id} isActive={product.isActive} />
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </div>
  );
}
