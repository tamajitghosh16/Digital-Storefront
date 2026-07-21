import Link from "next/link";
import { Check, FileText, Upload, Package, PlusCircle, ClipboardCheck, CreditCard } from "lucide-react";
import { Button } from "@repo/ui/button";
import { Card, CardContent } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";

// FR-6.1: entry point for the guided self-publishing wizard.
// Real implementation: a multi-step Server Action flow persisting a draft
// SelfPublishingProject row per step (see Technical Design Document 3.5).
const steps = [
  { title: "Author & book details", Icon: FileText },
  { title: "Manuscript upload", Icon: Upload },
  { title: "Package selection", Icon: Package },
  { title: "Add-ons", Icon: PlusCircle },
  { title: "Review", Icon: ClipboardCheck },
  { title: "Payment", Icon: CreditCard },
];

const packages = [
  { name: "Starter", price: "₹9,999", blurb: "Formatting and cover design to get you listed fast.", features: ["Print + e-book formatting", "1 stock cover design", "ISBN registration"] },
  { name: "Guided", price: "₹24,999", blurb: "Editorial support alongside production.", features: ["Everything in Starter", "1 round of copy editing", "Custom cover design", "Marketing checklist"], highlighted: true },
  { name: "Full-Service", price: "₹49,999", blurb: "End-to-end production and launch support.", features: ["Everything in Guided", "Developmental edit", "Launch campaign support", "Dedicated project manager"] },
];

export default function SelfPublishingLandingPage() {
  return (
    <div>
      <section className="border-b border-border bg-brand-navy-solid">
        <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8">
          <h1 className="font-serif text-4xl font-medium leading-tight text-white sm:text-5xl">
            Start your self-publishing project
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            From manuscript to marketplace — editing, design, and royalties, guided every step of the way.
          </p>
          <Button asChild size="lg" variant="accent" className="mt-8">
            <Link href="/self-publishing/wizard/step-1">Begin your project</Link>
          </Button>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-14 sm:px-8">
        <h2 className="text-center font-serif text-2xl font-medium text-brand-navy">How it works</h2>
        <ol className="mt-10 grid gap-6 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl border border-border bg-card p-5">
              <span className="text-xs font-semibold text-muted-foreground">Step {i + 1}</span>
              <div className="mt-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-navy-50">
                <step.Icon className="h-[18px] w-[18px] text-brand-navy" strokeWidth={1.75} />
              </div>
              <p className="mt-3 text-sm font-medium text-foreground">{step.title}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-t border-border bg-brand-cream/50 py-14">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <h2 className="text-center font-serif text-2xl font-medium text-brand-navy">Choose your package</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {packages.map((pkg) => (
              <Card key={pkg.name} className={pkg.highlighted ? "border-brand-navy shadow-md ring-1 ring-brand-navy" : ""}>
                <CardContent className="p-6">
                  {pkg.highlighted && <Badge className="mb-3">Most popular</Badge>}
                  <p className="font-serif text-lg font-medium text-brand-navy">{pkg.name}</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{pkg.price}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{pkg.blurb}</p>
                  <ul className="mt-5 space-y-2.5">
                    {pkg.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-foreground/90">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" strokeWidth={2} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
