import type { Metadata } from "next";
import { DummyPage } from "@/components/marketing/dummy-page";

export const metadata: Metadata = { title: "Teaching and Learning Materials" };

export default function TeachingLearningMaterialsPage() {
  return (
    <DummyPage
      category="Educational Materials"
      title="Teaching and Learning Materials"
      description="Published under Ink & Imagination. Transactional storefront listing, with 25% of sale volume contributed to the trust."
    />
  );
}
