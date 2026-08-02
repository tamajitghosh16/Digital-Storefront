// Admin-managed homepage content: banners, testimonials, FAQs, nav links
// and the singleton site settings row.

import type { Banner, Faq, NavLink, Testimonial } from "@repo/database";
import { NOW } from "./shared";

export const SAMPLE_BANNERS: Banner[] = [
  {
    id: "banner-hero",
    eyebrow: "New this season",
    title: "Your story, published your way.",
    subtitle:
      "Shop the catalogue, order custom e-book creation, or launch your own book through our guided self-publishing program.",
    imageUrl: null,
    ctaText: "Start self-publishing",
    ctaHref: "/self-publishing",
    secondaryCtaText: "Shop books",
    secondaryCtaHref: "/books",
    order: 0,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const SAMPLE_TESTIMONIALS: Testimonial[] = [
  {
    id: "testimonial-1",
    authorName: "Ananya Kulkarni",
    quote: "The Guided package took my manuscript from a Word doc to a real listing in under a month. Royalties show up like clockwork.",
    rating: 5,
    imageUrl: null,
    order: 0,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "testimonial-2",
    authorName: "Rohan Mehta",
    quote: "Ordered three physical copies for a book club — shipping was fast and the packaging was excellent.",
    rating: 5,
    imageUrl: null,
    order: 1,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "testimonial-3",
    authorName: "Farah Sheikh",
    quote: "Standard Formatting service made my EPUB look genuinely professional. Worth every rupee.",
    rating: 4,
    imageUrl: null,
    order: 2,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const SAMPLE_FAQS: Faq[] = [
  {
    id: "faq-1",
    question: "How long does self-publishing take?",
    answer:
      "Most Guided-package projects go from submission to a live storefront listing in 3–5 weeks, depending on how many rounds of revisions you use.",
    order: 0,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "faq-2",
    question: "Can I buy the same book as a physical copy and an e-book?",
    answer: "Yes — most titles are listed separately as a physical edition and an e-book so you can buy either or both.",
    order: 1,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: "faq-3",
    question: "How are royalties paid out?",
    answer: "Royalty balances accrue on every sale of a self-published title and are visible in your Publishing Dashboard under My Account.",
    order: 2,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

export const SAMPLE_HEADER_NAV: NavLink[] = [
  { id: "nav-1", label: "Books", href: "/books", location: "HEADER", order: 0, isActive: true, createdAt: NOW, updatedAt: NOW },
  { id: "nav-2", label: "E-Books", href: "/ebooks", location: "HEADER", order: 1, isActive: true, createdAt: NOW, updatedAt: NOW },
  { id: "nav-3", label: "Publishing Services", href: "/services", location: "HEADER", order: 2, isActive: true, createdAt: NOW, updatedAt: NOW },
  { id: "nav-4", label: "Self-Publishing", href: "/self-publishing", location: "HEADER", order: 3, isActive: true, createdAt: NOW, updatedAt: NOW },
];

export const SAMPLE_FOOTER_NAV: NavLink[] = [
  { id: "nav-f1", label: "Books", href: "/books", location: "FOOTER", order: 0, isActive: true, createdAt: NOW, updatedAt: NOW },
  { id: "nav-f2", label: "E-Books", href: "/ebooks", location: "FOOTER", order: 1, isActive: true, createdAt: NOW, updatedAt: NOW },
  { id: "nav-f3", label: "Publishing Services", href: "/services", location: "FOOTER", order: 2, isActive: true, createdAt: NOW, updatedAt: NOW },
  { id: "nav-f4", label: "Self-Publishing", href: "/self-publishing", location: "FOOTER", order: 3, isActive: true, createdAt: NOW, updatedAt: NOW },
];

export const SAMPLE_SITE_SETTINGS = {
  id: "singleton",
  siteName: "Shashibhushan's New School Book Press",
  tagline: "Physical books, e-books, and self-publishing — all under one roof.",
  metaTitle: null as string | null,
  metaDescription: "Physical books, e-books, self-publishing, and e-book creation services.",
  ogImageUrl: null as string | null,
  logoUrl: null as string | null,
  contactEmail: "hello@newschoolbookpress.example",
  contactPhone: "+91 98765 43210",
  addressLine: "14 Residency Road, Kolkata, Karnataka 560025",
  socialLinks: { twitter: "https://twitter.com", instagram: "https://instagram.com" } as unknown,
  updatedAt: NOW,
};
