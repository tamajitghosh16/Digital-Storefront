import type { Metadata } from "next";
import { DummyPage } from "@/components/marketing/dummy-page";

export const metadata: Metadata = { title: "Advocate's Diary (Naya Bandhu)" };

export default function AdvocateDiaryPage() {
  return (
    <DummyPage
      category="Professional Materials"
      title="Advocate's Diary (Naya Bandhu)"
      description="Physical legal stationery with integrated shipping. 25% of sale volume is pledged to the trust."
    />
  );
}
