import Link from "next/link";
import type { Department } from "@/lib/navigation";
import { Wrap, buttonClass } from "@/components/primitives";

/**
 * The department bar with hover-opened mega panels.
 *
 * Deliberately CSS-only — `group-hover` / `group-focus-within` rather
 * than React state — so the whole bar stays a Server Component and the
 * panels are keyboard-reachable by tabbing into them without any JS.
 * Panels are suppressed below 900px, where the drawer takes over.
 *
 * Each panel is anchored to its own department item (`relative` wrapper)
 * and sized with `w-max`, so it's only as wide as its widest row rather
 * than stretching edge-to-edge. It's capped at the viewport width, and
 * the last department's panel is right-aligned so a wide one (e.g. "All
 * Products") can't spill off-screen.
 */
export function DepartmentNav({ departments }: { departments: Department[] }) {
  return (
    <div className="relative z-50 border-y border-line bg-page">
      {/* Below 900px the bar scrolls sideways and the panels are off; from
          900px it wraps instead, because `overflow-x: auto` would clip an
          absolutely-positioned panel on the vertical axis too. */}
      <Wrap
        as="nav"
        className="flex gap-1 overflow-x-auto [scrollbar-width:none] min-[900px]:flex-wrap min-[900px]:justify-center min-[900px]:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {departments.map((department, index) => {
          const alignRight = index === departments.length - 1;
          return (
            <div key={department.label} className="group/dept relative shrink-0">
              <Link
                href={department.href}
                className="my-1 block whitespace-nowrap rounded-btn px-3.5 py-[13px] text-sm font-bold group-hover/dept:bg-tile group-focus-within/dept:bg-tile"
              >
                {department.label}
              </Link>

              {department.columns && (
                <div
                  className={`absolute top-full z-50 hidden w-max max-w-[min(calc(100vw-2rem),72rem)] rounded-b-tile border border-line bg-ground p-[30px] shadow-pop min-[900px]:group-hover/dept:block min-[900px]:group-focus-within/dept:block ${
                    alignRight ? "right-0" : "left-0"
                  }`}
                >
                  <div className="flex flex-wrap gap-x-10 gap-y-8">
                    {department.columns.map((column) => (
                      <div key={column.title} className="min-w-[11rem]">
                        <h4 className="caps mb-3.5 text-ink-muted">{column.title}</h4>
                        <ul className="flex flex-col gap-[11px]">
                          {column.items.map((leaf) => (
                            <li key={`${column.title}-${leaf.label}`}>
                              <Link href={leaf.href} className="block whitespace-nowrap text-sm hover:underline">
                                {leaf.label}
                                {leaf.note && <span className="block text-xs text-ink-muted">{leaf.note}</span>}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}

                    {department.promo && (
                      <div className="w-[16rem] shrink-0 rounded-tile bg-tile p-5 inset-ring inset-ring-card-edge">
                        <strong className="text-base font-bold">{department.promo.title}</strong>
                        <p className="mt-2 text-sm text-ink-muted">{department.promo.body}</p>
                        <Link
                          href={department.promo.href}
                          className={buttonClass(
                            department.promo.emphasis === "secondary" ? "secondary" : "primary",
                            "sm",
                            "mt-4"
                          )}
                        >
                          {department.promo.ctaLabel}
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </Wrap>
    </div>
  );
}
