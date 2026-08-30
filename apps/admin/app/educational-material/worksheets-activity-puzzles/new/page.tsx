import { PageHeader } from "@/components/ui";
import { getProductLineConfig, lineBasePath } from "../../_shared/product-line-config";
import { createLineProduct } from "../../_shared/actions";
import { SimpleProductForm } from "../../_shared/simple-product-form";

const config = getProductLineConfig("worksheets-activity-puzzles");

export default async function NewWorksheetActivityPuzzlePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;

  return (
    <div>
      <PageHeader
        title={config.copy.newTitle}
        description={config.copy.newDescription}
        backHref={lineBasePath(config.slug)}
        backLabel={config.label}
      />
      <SimpleProductForm action={createLineProduct.bind(null, config.slug)} config={config} error={error} />
    </div>
  );
}
