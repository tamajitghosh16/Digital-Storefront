import { PageHeader } from "@/components/ui";
import { createProduct } from "../actions";
import { ProductForm } from "../product-form";

export default async function NewProductPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader
        title="Add a book"
        description="Fill in what you know — you can come back and change any of it later."
        backHref="/catalogue"
        backLabel="Books & products"
      />
      <ProductForm action={createProduct} error={error} />
    </div>
  );
}
