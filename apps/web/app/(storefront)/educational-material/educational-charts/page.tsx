import type { Metadata } from "next";
import { CategoryListing } from "@/components/commerce/category-listing";

export const metadata: Metadata = { title: "Educational Charts" };

export default function EducationalChartsPage() {
  return <CategoryListing title="Educational Charts" />;
}
