import type { Metadata } from "next";
import { DummyPage } from "@/components/marketing/dummy-page";

export const metadata: Metadata = { title: "Bulk Publishing" };

export default function BulkPublishingPage() {
  return (
    <DummyPage
      category="Publishing"
      title="Bulk Publishing"
      description="Volume publishing and printing for schools, reading groups and institutions ordering the same title in quantity."
    />
  );
}
