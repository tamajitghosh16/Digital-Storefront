"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { ICON_BUTTON_CLASS, ICON_LABEL_CLASS } from "./icon-button";

const noopSubscribe = () => () => {};

// Renders a fixed-size placeholder until mounted: `resolvedTheme` is
// undefined on the server/first paint, and guessing an icon would flash
// the wrong one as soon as next-themes reads the persisted preference.
// useSyncExternalStore (server snapshot false, client snapshot true) gives
// a hydration-safe "mounted" flag without the setState-in-effect that a
// useState+useEffect version would need.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  if (!mounted) {
    return <div className="h-[54px] w-[44px]" aria-hidden />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={ICON_BUTTON_CLASS}
    >
      <span className="text-lg leading-none">
        {isDark ? <Sun className="h-[22px] w-[22px]" strokeWidth={1.9} /> : <Moon className="h-[22px] w-[22px]" strokeWidth={1.9} />}
      </span>
      <span className={ICON_LABEL_CLASS}>Theme</span>
    </button>
  );
}
