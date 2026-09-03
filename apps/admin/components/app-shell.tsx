"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import type { MenuCategory, MenuProduct } from "@repo/database";
import { SidebarNav } from "@/components/sidebar-nav";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";

export type InventoryCategory = MenuCategory & { products: MenuProduct[] };

/** Routes reachable with no session, or without a completed session — no dock, no topbar. */
const NO_CHROME_ROUTES = ["/sign-in", "/forgot-password", "/reset-password", "/unauthorized"];
const NO_CHROME_PREFIXES = ["/join/"]; // hashed staff sign-up link

const STOREFRONT_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";

const SIDEBAR_WIDTH_KEY = "admin.sidebarWidth";
const SIDEBAR_MIN_WIDTH = 220;
const SIDEBAR_MAX_WIDTH = 420;
const SIDEBAR_DEFAULT_WIDTH = 264;

/**
 * The sidebar's persisted width, as a tiny external store rather than
 * state-set-from-an-effect: localStorage isn't available during the server
 * render, so the server/first-paint snapshot is always the default and the
 * real value (if one was saved) arrives through useSyncExternalStore —
 * the same reconciliation React itself expects, without the extra render
 * pass "read localStorage, then setState" would otherwise cause.
 */
let sidebarWidthValue = SIDEBAR_DEFAULT_WIDTH;
let sidebarWidthLoaded = false;
const sidebarWidthListeners = new Set<() => void>();

function getSidebarWidth(): number {
  if (!sidebarWidthLoaded) {
    const stored = Number(window.localStorage.getItem(SIDEBAR_WIDTH_KEY));
    sidebarWidthValue =
      Number.isFinite(stored) && stored >= SIDEBAR_MIN_WIDTH && stored <= SIDEBAR_MAX_WIDTH
        ? stored
        : SIDEBAR_DEFAULT_WIDTH;
    sidebarWidthLoaded = true;
  }
  return sidebarWidthValue;
}

function getServerSidebarWidth(): number {
  return SIDEBAR_DEFAULT_WIDTH;
}

function setSidebarWidth(width: number) {
  sidebarWidthValue = width;
  sidebarWidthLoaded = true;
  window.localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
  sidebarWidthListeners.forEach((listener) => listener());
}

function subscribeSidebarWidth(listener: () => void) {
  sidebarWidthListeners.add(listener);
  return () => sidebarWidthListeners.delete(listener);
}

export function AppShell({
  siteName,
  userName,
  userRole,
  menuCategories,
  children,
}: {
  siteName?: string;
  userName: string | null;
  userRole: string | null;
  menuCategories: InventoryCategory[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sidebarWidth = useSyncExternalStore(subscribeSidebarWidth, getSidebarWidth, getServerSidebarWidth);
  const handleWidthChange = useCallback((width: number) => setSidebarWidth(width), []);

  if (NO_CHROME_ROUTES.includes(pathname) || NO_CHROME_PREFIXES.some((p) => pathname.startsWith(p))) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="mx-auto max-w-[110rem] p-2.5 lg:h-screen">
      <div className="flex flex-col gap-4 lg:h-full lg:flex-row">
        <Sidebar siteName={siteName} width={sidebarWidth} onWidthChange={handleWidthChange} menuCategories={menuCategories} />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-tile border border-line-strong bg-ground shadow-tile">
          <Topbar userName={userName} userRole={userRole} />
          <main className="flex-1 overflow-y-auto px-5 pb-16 pt-2 sm:px-7 lg:px-9">{children}</main>
        </div>
      </div>
    </div>
  );
}

/**
 * The sidebar. A white, thin-bordered rounded panel matching the content
 * panel beside it, per the approved mockup — nav groups get their own
 * bordered/tinted boxes inside it (see SidebarNav). On wide screens its
 * width is user-adjustable via the drag handle on its right edge.
 */
function Sidebar({
  siteName,
  width,
  onWidthChange,
  menuCategories,
}: {
  siteName?: string;
  width: number;
  onWidthChange: (width: number) => void;
  menuCategories: InventoryCategory[];
}) {
  return (
    <>
      {/* Wide screens: adjustable-width panel, its own internal scroll for a long nav. */}
      <aside className="relative hidden shrink-0 lg:block lg:h-full" style={{ width }}>
        <div className="flex h-full flex-col rounded-tile border border-line-strong bg-ground p-5 shadow-tile">
          <Wordmark siteName={siteName} />
          <div className="mt-3.5 min-h-0 flex-1">
            <SidebarNav menuCategories={menuCategories} />
          </div>
        </div>
        <SidebarResizeHandle width={width} onWidthChange={onWidthChange} />
      </aside>

      {/* Narrow screens: the same panel, collapsed to a bar that opens downward — fixed width, nothing to drag. */}
      <details className="group rounded-tile border border-line-strong bg-ground shadow-tile lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 [&::-webkit-details-marker]:hidden">
          <Wordmark siteName={siteName} />
          <span className="text-sm font-bold text-ink">
            <span className="group-open:hidden">Menu ▾</span>
            <span className="hidden group-open:inline">Close ▴</span>
          </span>
        </summary>
        <div className="px-4 pb-4">
          <SidebarNav menuCategories={menuCategories} />
        </div>
      </details>
    </>
  );
}

/** Drag handle on the sidebar's right edge. Double-click resets to the default width, VS Code-style. */
function SidebarResizeHandle({ width, onWidthChange }: { width: number; onWidthChange: (width: number) => void }) {
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    function handlePointerMove(e: PointerEvent) {
      if (!dragRef.current) return;
      const next = dragRef.current.startWidth + (e.clientX - dragRef.current.startX);
      onWidthChange(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, next)));
    }
    function handlePointerUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
      document.body.style.removeProperty("cursor");
      document.body.style.removeProperty("user-select");
    }
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [onWidthChange]);

  function handlePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: width };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuenow={width}
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      onPointerDown={handlePointerDown}
      onDoubleClick={() => onWidthChange(SIDEBAR_DEFAULT_WIDTH)}
      className="group absolute top-0 -right-2 z-10 h-full w-4 cursor-col-resize touch-none"
    >
      <div className="mx-auto h-full w-px bg-transparent transition-colors group-hover:bg-line-strong" />
    </div>
  );
}

function Wordmark({ siteName }: { siteName?: string }) {
  return (
    <div className="min-w-0 border-b border-line pb-4">
      {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
      <img
        src="/logo.svg"
        alt={siteName ?? "New School Book Press"}
        className="h-auto w-full object-contain dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
      <img
        src="/logo-dark.svg"
        alt={siteName ?? "New School Book Press"}
        className="hidden h-auto w-full object-contain dark:block"
      />
      <p className="mt-2 text-xs font-medium text-ink-muted">Back office</p>
    </div>
  );
}

function Topbar({ userName, userRole }: { userName: string | null; userRole: string | null }) {
  return (
    <div className="px-4 pt-4 sm:px-5 sm:pt-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 rounded-full border border-line-strong px-4 py-2 shadow-tile sm:px-5">
        <a
          href={STOREFRONT_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:bg-tile"
        >
          View webstore ↗
        </a>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {userName && (
            <>
              <div
                aria-hidden
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-bold text-ground"
              >
                {getInitials(userName)}
              </div>
              <span className="text-[13px] font-medium text-ink">{userName}</span>
              {userRole && (
                <span className="rounded-full border border-line-strong px-2.5 py-[3px] text-[11px] tracking-[0.03em] text-ink-muted">
                  {userRole}
                </span>
              )}
              <SignOutButton />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** "Elena Cross" → "EC"; a bare email falls back to its first letter. */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
}
