import type { Metadata } from "next";
import { LISTING_LINES } from "@/lib/product-lines";
import { LineListingPage } from "../_shared/line-pages";

export const metadata: Metadata = { title: "Educational Charts" };

// Every published `Product` the admin's Educational Charts section wrote — see
// `../_shared/line-pages`.
export default function EducationalChartsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LineListingPage line={LISTING_LINES["educational-charts"]} searchParams={searchParams} />;
}
