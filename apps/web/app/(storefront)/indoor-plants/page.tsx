import type { Metadata } from "next";
import { DummyPage } from "@/components/marketing/dummy-page";

export const metadata: Metadata = { title: "Indoor Plants (Chatterjee's Green Veranda)" };

export default function IndoorPlantsPage() {
  return (
    <DummyPage
      category="Lifestyle"
      title="Indoor Plants (Chatterjee's Green Veranda)"
      description="Fosters environmental conservation and a connection with nature. Requests route as local booking/delivery inquiries, with 25% of sale volume pledged to the trust."
    />
  );
}
