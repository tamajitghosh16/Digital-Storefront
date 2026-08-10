import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Space_Grotesk } from "next/font/google";
import { getCurrentUser } from "@repo/auth/server";
import { getSiteSettings } from "@repo/database";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

// Space Grotesk announces a screen or a number; Manrope does the actual
// work of labels, body copy and buttons; Plex Mono gives table figures and
// codes a ledger feel. See app/globals.css for how these map onto tokens.
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["500", "700"],
  display: "swap",
});
const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-plex-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Back Office — Shashibhushan's New School Book Press",
  description: "Internal admin: catalogue, orders, submissions, royalties, analytics.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Both reads are best-effort: this shell also wraps /sign-in,
  // /forgot-password, /reset-password and /unauthorized, which are
  // reachable with no session and, in the case of a cold environment, no
  // database either.
  const [user, settings] = await Promise.all([
    getCurrentUser().catch(() => null),
    getSiteSettings().catch(() => null),
  ]);

  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen bg-page font-sans text-ink antialiased">
        <AppShell siteName={settings?.siteName} userName={user?.name ?? user?.email ?? null} userRole={user?.role ?? null}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
