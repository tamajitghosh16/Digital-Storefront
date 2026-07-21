import { notFound } from "next/navigation";
import { prisma } from "@repo/database";
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
      <h1 className="text-2xl font-bold">Edit Product</h1>
      <ProductForm action={updateProduct.bind(null, product.id)} product={product} error={error} />
    </div>
  );
}
