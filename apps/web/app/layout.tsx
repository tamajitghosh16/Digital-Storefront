import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@repo/database";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ThemeProvider } from "@/components/layout/theme-provider";

// Graphik is the reference face and isn't licensed here; Inter is the
// closest grotesque available and the only weights the design uses are
// 400 and 700, so nothing else is loaded.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

// Admin-controlled via Settings > Site Settings in apps/admin.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={inter.variable} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-page font-sans text-ink antialiased">
        <ThemeProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
