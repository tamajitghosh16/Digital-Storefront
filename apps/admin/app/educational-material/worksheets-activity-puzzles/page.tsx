import { prisma } from "@repo/database";
import { ButtonLink, PageHeader } from "@/components/ui";
import { getProductLineConfig, lineBasePath } from "../_shared/product-line-config";
import { SimpleProductsList } from "../_shared/simple-products-list";

// The inventory CMS for the "Worksheets and Activity Puzzles" product line — the same shape as
// `../books`, sharing its list + form + Server Actions through `../_shared`.
// See `_shared/product-line-config.ts` for what differs between the lines.

const config = getProductLineConfig("worksheets-activity-puzzles");

export default async function WorksheetActivityPuzzlesPage() {
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
        action={<ButtonLink href={`${lineBasePath(config.slug)}/new`}>Add new {config.noun}</ButtonLink>}
      />
      <SimpleProductsList products={products} config={config} />
    </div>
  );
}
