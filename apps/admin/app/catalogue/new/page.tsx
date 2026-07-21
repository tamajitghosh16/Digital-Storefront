import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <h1 className="text-2xl font-bold">New Product</h1>
      <ProductForm action={createProduct} error={error} />
    </div>
  );
}
