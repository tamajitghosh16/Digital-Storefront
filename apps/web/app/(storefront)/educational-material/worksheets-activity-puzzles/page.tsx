import type { Metadata } from "next";
import { LISTING_LINES } from "@/lib/product-lines";
import { LineListingPage } from "../_shared/line-pages";

export const metadata: Metadata = { title: "Worksheets and Activity Puzzles" };

// Every published `Product` the admin's Worksheets and Activity Puzzles section wrote — see
// `../_shared/line-pages`.
export default function WorksheetsActivityPuzzlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <LineListingPage line={LISTING_LINES["worksheets-activity-puzzles"]} searchParams={searchParams} />;
}
