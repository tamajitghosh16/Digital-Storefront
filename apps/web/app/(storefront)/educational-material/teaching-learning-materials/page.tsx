import type { Metadata } from "next";
import { CategoryListing } from "@/components/commerce/category-listing";

export const metadata: Metadata = { title: "Teaching and Learning Materials" };

export default function TeachingLearningMaterialsPage() {
  return <CategoryListing title="Teaching and Learning Materials" />;
}
