import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getCachedSiteSettings } from "@/lib/cms";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ContactButtons } from "@/components/layout/contact-buttons";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { WishlistProvider } from "@/components/commerce/wishlist-provider";
import { CartSync } from "@/components/commerce/cart-sync";
import { getCurrentUser } from "@repo/auth/server";
import { withFallback } from "@/lib/safe-fetch";
import { mailtoUrl, whatsAppUrl } from "@/lib/contact";
import { headers } from "next/headers";

// Graphik is the reference face and isn't licensed here; Inter is the
// closest grotesque available and the only weights the design uses are
// 400 and 700, so nothing else is loaded.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Admin-controlled via Settings > Site Settings in apps/admin.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getCachedSiteSettings();
  return {
    title: settings.metaTitle || settings.siteName,
    description: settings.metaDescription ?? undefined,
    openGraph: settings.ogImageUrl
      ? {
          title: settings.metaTitle || settings.siteName,
          description: settings.metaDescription ?? undefined,
          images: [settings.ogImageUrl],
        }
      : undefined,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Per-request CSP nonce minted by proxy.ts. next-themes injects an inline
  // script to avoid a theme flash; it only runs if it carries this nonce.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // Who the cart and wishlist belong to. `cache()`d, so the header's own
  // lookup reuses it; re-read on every sign-in/sign-out `router.refresh()`.
  const user = await withFallback(() => getCurrentUser(), null);
  const userId = user?.id ?? null;
  // WhatsApp number from env (read at request time, so changing it needs no
  // rebuild); the email is the admin-managed Site Settings contact address.
  const settings = await withFallback(() => getCachedSiteSettings(), null);
  const whatsAppHref = whatsAppUrl(process.env.WHATSAPP_NUMBER, process.env.WHATSAPP_GREETING || undefined);
  const emailHref = mailtoUrl(settings?.contactEmail, "Enquiry from the website");

  return (
    <html lang="en" data-scroll-behavior="smooth" className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-page font-sans text-ink antialiased">
        <ThemeProvider nonce={nonce}>
          <CartSync userId={userId} />
          <WishlistProvider userId={userId}>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <ContactButtons whatsAppHref={whatsAppHref} emailHref={emailHref} />
          </WishlistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
