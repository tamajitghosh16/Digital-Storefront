import { cache } from "react";
import { CONTENT_DEFAULTS, DEFAULT_PRICING_CONFIG } from "@repo/database";
import { withFallback } from "@/lib/safe-fetch";
import { getCachedContent, getCachedPricingConfig, getCachedSiteSettings } from "@/lib/cms";
import { SAMPLE_SITE_SETTINGS } from "@/lib/sample-data";

/**
 * Everything the policy pages quote about the business, merged from Site
 * Settings and the "Policies and contact page" content group, with the
 * blank-means-fallback rules applied once here so the pages never have to.
 */
export interface PolicyDetails {
  siteName: string;
  /** Registered name, or the site name when none is set. */
  legalName: string;
  gstin: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  grievanceName: string | null;
  /** The grievance email, falling back to the contact email. */
  grievanceEmail: string | null;
  /** "the courts at Kolkata, West Bengal" or a neutral fallback. */
  courts: string;
  supportHours: string;
  returnWindowDays: number;
  dispatchTime: string;
  lastUpdated: string;
  freeDeliveryOverCents: number;
  /** The standard delivery charge below the free-delivery threshold. */
  deliveryFeeCents: number;
  standardEta: string;
}

export const getPolicyDetails = cache(async (): Promise<PolicyDetails> => {
  const [settings, content, pricing] = await Promise.all([
    withFallback(() => getCachedSiteSettings(), SAMPLE_SITE_SETTINGS),
    withFallback(() => getCachedContent(), CONTENT_DEFAULTS),
    withFallback(() => getCachedPricingConfig(), DEFAULT_PRICING_CONFIG),
  ]);

  const text = (value: string | null | undefined) => value?.trim() || null;
  const days = Number.parseInt(content["policies.returnWindowDays"], 10);
  const jurisdiction = text(content["policies.jurisdiction"]);

  return {
    siteName: settings.siteName,
    legalName: text(content["policies.legalName"]) ?? settings.siteName,
    gstin: text(content["policies.gstin"]),
    contactEmail: text(settings.contactEmail),
    contactPhone: text(settings.contactPhone),
    address: text(settings.addressLine),
    grievanceName: text(content["policies.grievanceOfficer.name"]),
    grievanceEmail: text(content["policies.grievanceOfficer.email"]) ?? text(settings.contactEmail),
    courts: jurisdiction ? `the courts at ${jurisdiction}` : "the courts where our registered office is located",
    supportHours: content["policies.supportHours"],
    returnWindowDays: Number.isFinite(days) && days > 0 ? days : 7,
    dispatchTime: content["policies.dispatchTime"],
    lastUpdated: content["policies.lastUpdated"],
    freeDeliveryOverCents: pricing.delivery.freeOverCents,
    // Mirrors lib/pricing.ts's deliveryFeeCents(): standard delivery under
    // the threshold is charged at the express fee.
    deliveryFeeCents: pricing.delivery.expressFeeCents,
    standardEta: pricing.delivery.standardEta,
  };
});
