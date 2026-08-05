import type { Metadata } from "next";
import { DummyPage } from "@/components/marketing/dummy-page";

export const metadata: Metadata = { title: "Digital Tracking System" };

export default function DigitalTrackingSystemPage() {
  return (
    <DummyPage
      category="Digital & Tech Solutions"
      title="Digital Tracking System"
      description="Productivity software offered as a direct file entitlement or enterprise access credential. 25% of sale volume is contributed to the trust."
    />
  );
}
