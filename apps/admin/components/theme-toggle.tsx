"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

const noopSubscribe = () => () => {};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoids a flash of the wrong icon: resolvedTheme is undefined until
  // next-themes' blocking script has run on the client.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  if (!mounted) {
    return <div className="h-[34px] w-[34px]" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title="Toggle theme"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full border border-line-strong text-ink transition-[background-color,transform] duration-200 hover:rotate-[25deg] hover:bg-tile"
    >
      {isDark ? <Sun className="h-4 w-4" strokeWidth={2} /> : <Moon className="h-4 w-4" strokeWidth={2} />}
    </button>
  );
}
