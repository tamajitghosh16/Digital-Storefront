import type { Metadata } from "next";
import { DummyPage } from "@/components/marketing/dummy-page";

export const metadata: Metadata = { title: "Worksheets and Activity Puzzles" };

export default function WorksheetsActivityPuzzlesPage() {
  return (
    <DummyPage
      category="Educational Materials"
      title="Worksheets and Activity Puzzles"
      description="Published under Ink & Imagination. Direct digital purchase, with 25% of sale volume going to the trust."
    />
  );
}
