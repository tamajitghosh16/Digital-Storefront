"use client";

import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { SignOutButton } from "@/components/sign-out-button";

/** Routes reachable with no session, or without a completed session — no dock, no topbar. */
const NO_CHROME_ROUTES = ["/sign-in", "/forgot-password", "/reset-password", "/unauthorized"];

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";

export function AppShell({
  siteName,
  userName,
  userRole,
  children,
}: {
  siteName?: string;
  userName: string | null;
  userRole: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (NO_CHROME_ROUTES.includes(pathname)) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="mx-auto flex max-w-[110rem] flex-col lg:flex-row lg:items-start">
      <Sidebar siteName={siteName} />

      <div className="min-w-0 flex-1">
        <Topbar userName={userName} userRole={userRole} />
        <main className="px-5 pb-16 pt-2 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}

/**
 * The dock. One black, fully-rounded panel carries all of the navigation —
 * the single element the redesign is built around. Everything else in the
 * app stays quiet (white ground, hairline rules) so this is the one thing
 * that reads as designed rather than merely tidy.
 */
function Sidebar({ siteName }: { siteName?: string }) {
  return (
    <>
      {/* Wide screens: floats clear of the page edge, pinned while the
          canvas scrolls, with its own internal scroll for a long nav. */}
      <aside className="hidden shrink-0 p-4 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-72">
        <div className="flex h-full max-h-[calc(100vh-2rem)] flex-col overflow-y-auto rounded-tile bg-ink p-5 text-white shadow-tile">
          <Wordmark siteName={siteName} />
          <div className="mt-7 flex-1">
            <SidebarNav />
          </div>
        </div>
      </aside>

      {/* Narrow screens: the same dock, collapsed to a bar that opens
          downward — one nav component, not two. */}
      <details className="group m-3 rounded-tile bg-ink text-white lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
          <Wordmark siteName={siteName} />
          <span className="text-sm font-bold">
            <span className="group-open:hidden">Menu ▾</span>
            <span className="hidden group-open:inline">Close ▴</span>
          </span>
        </summary>
        <div className="px-4 pb-4">
          <SidebarNav />
        </div>
      </details>
    </>
  );
}

function Wordmark({ siteName }: { siteName?: string }) {
  return (
    <div className="min-w-0 px-1">
      <p className="font-display text-base font-bold tracking-[-0.02em]">Back Office</p>
      <p className="truncate text-[12px] text-white/55">{siteName ?? "New School Book Press"}</p>
    </div>
  );
}

function Topbar({ userName, userRole }: { userName: string | null; userRole: string | null }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-x-5 gap-y-2 px-5 pb-4 pt-6 sm:px-8 lg:px-10">
      <a
        href={STOREFRONT_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-1.5 text-[13px] font-bold text-ink transition-colors hover:bg-tile"
      >
        View storefront ↗
      </a>
      {userName && (
        <div className="flex items-center gap-3">
          <p className="text-sm text-ink-muted">
            {userName}
            {userRole && (
              <span className="ml-2 rounded-full border border-line-strong px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink">
                {userRole}
              </span>
            )}
          </p>
          <span className="h-4 w-px bg-line" aria-hidden />
          <SignOutButton />
        </div>
      )}
    </div>
  );
}
