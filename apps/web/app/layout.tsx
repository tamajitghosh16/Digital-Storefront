import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@repo/database";
import { SiteHeader } from "../components/site-header";
import { SiteFooter } from "../components/site-footer";
import { ThemeProvider } from "../components/theme-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz", "SOFT"],
});

// Admin-controlled via Settings > Site Settings in apps/admin — was
// previously a static string here.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  return {
    title: settings.metaTitle || settings.siteName,
    description: settings.metaDescription ?? undefined,
    openGraph: settings.ogImageUrl
      ? { title: settings.metaTitle || settings.siteName, description: settings.metaDescription ?? undefined, images: [settings.ogImageUrl] }
      : undefined,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <ThemeProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
