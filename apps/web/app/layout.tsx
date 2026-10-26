import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getCachedSiteSettings } from "@/lib/cms";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { WishlistProvider } from "@/components/commerce/wishlist-provider";
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

  return (
    <html lang="en" data-scroll-behavior="smooth" className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-page font-sans text-ink antialiased">
        <ThemeProvider nonce={nonce}>
          <WishlistProvider>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </WishlistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
