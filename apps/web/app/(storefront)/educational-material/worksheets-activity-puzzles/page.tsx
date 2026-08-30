import type { Metadata } from "next";
import { CategoryListing } from "@/components/commerce/category-listing";

export const metadata: Metadata = { title: "Worksheets and Activity Puzzles" };

export default function WorksheetsActivityPuzzlesPage() {
  return <CategoryListing title="Worksheets and Activity Puzzles" />;
}
