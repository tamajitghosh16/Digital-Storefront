import type { Metadata } from "next";
import { LISTING_LINES } from "@/lib/product-lines";
import { LineProductPage, lineProductMetadata } from "../../_shared/line-pages";

const line = LISTING_LINES["teaching-learning-materials"];

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return lineProductMetadata(line, (await params).slug);
}

export default async function TeachingLearningMaterialDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  return <LineProductPage line={line} slug={(await params).slug} />;
}
