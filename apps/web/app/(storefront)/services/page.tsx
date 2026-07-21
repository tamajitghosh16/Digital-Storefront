import type { Metadata } from "next";
import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { prisma } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { SAMPLE_SERVICES, SERVICE_ADDONS } from "@/lib/sample-data";
import { Card, CardContent } from "@repo/ui/card";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";

export const metadata: Metadata = { title: "Publishing Services" };

const FEATURED_SLUG = "standard-formatting";

// FR-2.3: service-package catalogue (Basic/Standard/Premium e-book
// creation) plus optional add-ons — mirrors the mockup's Services page,
// which this app previously had no listing for (only /services/[slug]).
export default async function ServicesCataloguePage() {
  const services = await withFallback(
    () =>
      prisma.product.findMany({
        where: { type: "SERVICE_PACKAGE", isPublished: true },
        orderBy: { priceCents: "asc" },
      }),
    SAMPLE_SERVICES
  );

  return (
    <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
      <h1 className="font-serif text-3xl font-medium text-brand-navy">Digital Services — E-Book Creation</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Have a finished manuscript? Choose a package below and we&apos;ll turn it into a polished, publish-ready
        e-book — formatting, cover design, and multi-format delivery included.
      </p>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {services.map((service) => {
          const highlighted = service.slug === FEATURED_SLUG;
          const features = (service.description ?? "").split("\n").filter(Boolean);
          return (
            <Card
              key={service.id}
              className={highlighted ? "relative border-brand-accent shadow-md ring-1 ring-brand-accent" : "relative"}
            >
              {highlighted && (
                <Badge variant="accent" className="absolute -top-3 right-5">
                  Most popular
                </Badge>
              )}
              <CardContent className="p-6">
                <p className="font-serif text-lg font-medium text-brand-navy">{service.title}</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">₹{(service.priceCents / 100).toFixed(2)}</p>
                {service.turnaroundDays != null && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" strokeWidth={1.75} /> {service.turnaroundDays}-day turnaround
                  </p>
                )}
                <ul className="mt-5 space-y-2.5">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-foreground/90">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-navy" strokeWidth={2} />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button asChild className="mt-6 w-full" variant={highlighted ? "accent" : "outline"}>
                  <Link href={`/services/${service.slug}`}>Select package</Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-14">
        <h2 className="font-serif text-2xl font-medium text-brand-navy">Optional add-ons</h2>
        <Card className="mt-5 max-w-xl">
          <CardContent className="divide-y divide-border p-0">
            {SERVICE_ADDONS.map((addon) => (
              <div key={addon.name} className="flex items-center justify-between px-6 py-4 text-sm">
                <span className="text-foreground/90">{addon.name}</span>
                <span className="font-semibold text-brand-navy">+₹{(addon.priceCents / 100).toFixed(2)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
