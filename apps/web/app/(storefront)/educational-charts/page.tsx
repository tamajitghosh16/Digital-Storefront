import type { Metadata } from "next";
import { DummyPage } from "@/components/marketing/dummy-page";

export const metadata: Metadata = { title: "Educational Charts" };

export default function EducationalChartsPage() {
  return (
    <DummyPage
      category="Educational Materials"
      title="Educational Charts"
      description="Published under Ink & Imagination. Direct checkout via domestic payment aggregators, with 25% of sale volume allocated to trust initiatives."
    />
  );
}
