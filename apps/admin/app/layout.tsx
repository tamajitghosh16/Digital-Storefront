import type { Metadata } from "next";
import { getCurrentUser } from "@repo/auth/server";
import { getSiteSettings } from "@repo/database";
import { SidebarNav } from "@/components/sidebar-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Back Office — Shashibhushan's New School Book Press",
  description: "Internal admin: catalogue, orders, submissions, royalties, analytics.",
  robots: { index: false, follow: false },
};

/** Where "View storefront" points. Falls back to the local dev port. */
const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Both reads are best-effort: this shell also wraps /sign-in and
  // /unauthorized, which are reachable with no session and, in the case of a
  // cold environment, no database either.
  const [user, settings] = await Promise.all([
    getCurrentUser().catch(() => null),
    getSiteSettings().catch(() => null),
  ]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-page text-ink antialiased">
        <div className="mx-auto flex max-w-[110rem] flex-col lg:flex-row">
          <Sidebar siteName={settings?.siteName} />

          <div className="min-w-0 flex-1">
            <Topbar userName={user?.name ?? user?.email ?? null} userRole={user?.role ?? null} />
            <main className="px-5 py-8 sm:px-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}

function Sidebar({ siteName }: { siteName?: string }) {
  return (
    <>
      {/* Wide screens: a permanent column. */}
      <aside className="hidden w-64 shrink-0 border-r border-line bg-ground lg:block">
        <div className="sticky top-0 max-h-screen overflow-y-auto p-4">
          <Wordmark siteName={siteName} />
          <div className="mt-6">
            <SidebarNav />
          </div>
        </div>
      </aside>

      {/* Narrow screens: the same navigation behind a disclosure, so the back
          office stays usable from a phone without a second nav component. */}
      <details className="group border-b border-line bg-ground lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 [&::-webkit-details-marker]:hidden">
          <Wordmark siteName={siteName} />
          <span className="text-sm font-bold text-brand">
            <span className="group-open:hidden">Menu ▾</span>
            <span className="hidden group-open:inline">Close ▴</span>
          </span>
        </summary>
        <div className="px-5 pb-5">
          <SidebarNav />
        </div>
      </details>
    </>
  );
}

function Wordmark({ siteName }: { siteName?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-bold tracking-[-0.01em] text-ink">Back Office</p>
      <p className="truncate text-[12px] text-ink-subtle">{siteName ?? "New School Book Press"}</p>
    </div>
  );
}

function Topbar({ userName, userRole }: { userName: string | null; userRole: string | null }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 border-b border-line bg-ground px-5 py-3 sm:px-8">
      <a
        href={STOREFRONT_URL}
        target="_blank"
        rel="noreferrer"
        className="text-sm font-semibold text-brand hover:underline"
      >
        View storefront ↗
      </a>
      {userName && (
        <p className="text-sm text-ink-muted">
          {userName}
          {userRole && <span className="ml-2 rounded-full bg-tile px-2 py-0.5 text-[11px] font-bold">{userRole}</span>}
        </p>
      )}
    </div>
  );
}
