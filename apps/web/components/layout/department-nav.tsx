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
        {departments.map((department) => (
          <div key={department.label} className="group/dept static shrink-0">
            <Link
              href={department.href}
              className="my-1 block whitespace-nowrap rounded-btn px-3.5 py-[13px] text-sm font-bold group-hover/dept:bg-tile group-focus-within/dept:bg-tile"
            >
              {department.label}
            </Link>

            {department.columns && (
              <div className="absolute inset-x-0 top-full hidden border-b border-line bg-ground py-[30px] shadow-pop min-[900px]:group-hover/dept:block min-[900px]:group-focus-within/dept:block">
                <Wrap className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
                  {department.columns.map((column) => (
                    <div key={column.title}>
                      <h4 className="caps mb-3.5 text-ink-muted">{column.title}</h4>
                      <ul className="flex flex-col gap-[11px]">
                        {column.items.map((leaf) => (
                          <li key={`${column.title}-${leaf.label}`}>
                            <Link href={leaf.href} className="text-sm hover:underline">
                              {leaf.label}
                              {leaf.note && <span className="block text-xs text-ink-muted">{leaf.note}</span>}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}

                  {department.promo && (
                    <div className="rounded-tile bg-tile p-5 inset-ring inset-ring-card-edge">
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
                </Wrap>
              </div>
            )}
          </div>
        ))}
      </Wrap>
    </div>
  );
}
