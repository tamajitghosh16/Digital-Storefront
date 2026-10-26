import type { Metadata } from "next";
import { LISTING_LINES } from "@/lib/product-lines";
import { LineListingPage } from "../_shared/line-pages";

export const metadata: Metadata = { title: "Teaching and Learning Materials" };

// Every published `Product` the admin's Teaching and Learning Materials section wrote — see
// `../_shared/line-pages`.
export default function TeachingLearningMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LineListingPage line={LISTING_LINES["teaching-learning-materials"]} searchParams={searchParams} />;
}
