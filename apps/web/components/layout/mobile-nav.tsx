"use client";
import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Menu } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@repo/ui/sheet";
import { buttonClass } from "@/components/primitives";
import type { Department } from "@/lib/navigation";

/**
 * Department drawer for narrow screens, where the hover panels are off.
 * Native `<details>` disclosures rather than an accordion component —
 * no extra state to keep in sync inside a sheet that already owns
 * open/closed.
 */
export function MobileNav({ departments, signedIn }: { departments: Department[]; signedIn: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-btn text-ink transition-colors hover:bg-tile min-[900px]:hidden"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
      </SheetTrigger>

      <SheetContent side="left" className="overflow-y-auto bg-page text-ink">
        <SheetHeader>
          <SheetTitle className="text-lg font-bold tracking-[-0.01em]">Shop by department</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col">
          {departments.map((department) => (
            <div key={department.label} className="border-b border-line">
              {department.columns ? (
                <details className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between py-3 text-[15px] font-bold marker:content-['']">
                    {department.label}
                    <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" strokeWidth={2} />
                  </summary>
                  <div className="pb-3">
                    <SheetClose asChild>
                      <Link href={department.href} className="block py-1.5 text-sm font-bold underline underline-offset-2">
                        Shop all {department.label}
                      </Link>
                    </SheetClose>
                    {department.columns.map((column) => (
                      <div key={column.title} className="mt-3">
                        <p className="caps text-ink-muted">{column.title}</p>
                        <ul className="mt-1.5">
                          {column.items.map((leaf) => (
                            <li key={`${column.title}-${leaf.label}`}>
                              <SheetClose asChild>
                                <Link href={leaf.href} className="block py-1.5 text-sm text-ink-muted">
                                  {leaf.label}
                                </Link>
                              </SheetClose>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              ) : (
                <SheetClose asChild>
                  <Link href={department.href} className="block py-3 text-[15px] font-bold">
                    {department.label}
                  </Link>
                </SheetClose>
              )}
            </div>
          ))}
        </nav>

        <SheetClose asChild>
          <Link href={signedIn ? "/account/orders" : "/sign-in"} className={buttonClass("primary", "md", "mt-4 w-full")}>
            {signedIn ? "My account" : "Sign in"}
          </Link>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
