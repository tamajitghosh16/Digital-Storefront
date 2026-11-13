import type { Metadata } from "next";
import { IBM_Plex_Mono, Manrope, Space_Grotesk } from "next/font/google";
import { getCurrentStaff } from "@repo/auth/server";
import { AppShell } from "@/components/app-shell";
import { getChromeMenu, getChromeSiteName } from "@/lib/admin-cache";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { headers } from "next/headers";

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
  // Per-request CSP nonce from proxy.ts, for next-themes' inline script.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  // All three reads are best-effort: this shell also wraps /sign-in,
  // /forgot-password, /reset-password and /unauthorized, which are
  // reachable with no session and, in the case of a cold environment, no
  // database either. The site name and menu are cached (lib/admin-cache.ts)
  // and expire the moment staff save either; the staff member never is.
  const [user, siteName, menuCategories] = await Promise.all([
    getCurrentStaff().catch(() => null),
    getChromeSiteName().catch(() => undefined),
    getChromeMenu().catch(() => []),
  ]);

  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-page font-sans text-ink antialiased">
        <ThemeProvider nonce={nonce}>
          <AppShell
            siteName={siteName}
            userName={user?.name ?? user?.email ?? null}
            userRole={user?.role ?? null}
            menuCategories={menuCategories}
          >
            {children}
          </AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
