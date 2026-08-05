import type { Metadata } from "next";
import { DummyPage } from "@/components/marketing/dummy-page";

export const metadata: Metadata = { title: "Naya Bandhu (Application)" };

export default function NayaBandhuPage() {
  return (
    <DummyPage
      category="Digital & Tech Solutions"
      title="Naya Bandhu (Application)"
      description="App-based legal productivity tools for advocates, with secure App Store / Play Store download access."
    />
  );
}
