import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { PageHeader, Pill } from "@/components/ui";
import { getProductLineConfig, lineBasePath } from "../../_shared/product-line-config";
import { updateLineProduct } from "../../_shared/actions";
import { SimpleProductForm } from "../../_shared/simple-product-form";

const config = getProductLineConfig("educational-charts");

export default async function EditEducationalChartPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const product = await prisma.product.findUnique({ where: { id } });
  // Guard the line boundary: a Books id pasted into this route is a 404 here,
  // not an edit form that would silently re-tag the row on save.
  if (!product || product.productLine !== config.productLine) notFound();

  return (
    <div>
      <PageHeader
        title={product.title}
        description={product.author}
        backHref={lineBasePath(config.slug)}
        backLabel={config.label}
        action={
          <Pill tone={product.isPublished ? "on" : "off"}>
            {product.isPublished ? "Showing in the shop" : "Hidden from the shop"}
          </Pill>
        }
      />
      <SimpleProductForm
        action={updateLineProduct.bind(null, config.slug, product.id)}
        config={config}
        product={product}
        error={error}
      />
    </div>
  );
}
