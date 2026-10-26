import { prisma } from "@repo/database";
import { PageHeader, SavedBanner } from "@/components/ui";
import { AddLineProductDialog } from "../_shared/add-line-product-dialog";
import { getProductLineConfig } from "../_shared/product-line-config";
import { SimpleProductsList } from "../_shared/simple-products-list";
import { requireStaffPage } from "@/lib/guard";

// The inventory CMS for the "Worksheets and Activity Puzzles" product line — the same shape as
// `../books`, sharing its list + form + Server Actions through `../_shared`.
// See `_shared/product-line-config.ts` for what differs between the lines.

const config = getProductLineConfig("worksheets-activity-puzzles");

export default async function WorksheetActivityPuzzlesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  await requireStaffPage();
  const { error, created } = await searchParams;
  const products = await prisma.product.findMany({
    where: { productLine: config.productLine },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <div className="max-w-6xl pt-10">
      <PageHeader
        title={config.label}
        description={config.copy.listDescription}
        action={<AddLineProductDialog config={config} error={error} />}
      />
      {created && (
        <div className="mb-6">
          <SavedBanner message={config.copy.addedMessage} />
        </div>
      )}
      <SimpleProductsList products={products} config={config} />
    </div>
  );
}
