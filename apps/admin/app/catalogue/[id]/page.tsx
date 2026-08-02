import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
import { PageHeader, Pill } from "@/components/ui";
import { updateProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) notFound();

  return (
    <div>
      <PageHeader
        title={product.title}
        description={product.author}
        backHref="/catalogue"
        backLabel="Books & products"
        action={
          <Pill tone={product.isPublished ? "on" : "off"}>
            {product.isPublished ? "Showing in the shop" : "Hidden from the shop"}
          </Pill>
        }
      />
      <ProductForm action={updateProduct.bind(null, product.id)} product={product} error={error} />
    </div>
  );
}
