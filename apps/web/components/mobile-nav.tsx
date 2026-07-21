"use client";
import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@repo/ui/sheet";
import { Separator } from "@repo/ui/separator";

interface NavLinkData {
  id: string;
  label: string;
  href: string;
}

interface CatalogGroupData {
  category: string;
  items: { slug: string; title: string }[];
}

export function MobileNav({
  links,
  catalogGroups,
  siteName,
  signedIn,
}: {
  links: NavLinkData[];
  catalogGroups: CatalogGroupData[];
  siteName: string;
  signedIn: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label="Open menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- static vector logo, no benefit from next/image optimization */}
            <img src="/logo.svg" alt={siteName} className="h-11 w-auto" />
          </SheetTitle>
        </SheetHeader>
        <Separator />
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <SheetClose asChild key={link.id}>
              <Link
                href={link.href}
                className="rounded-lg px-2 py-2.5 text-[15px] font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>

        {catalogGroups.length > 0 && (
          <>
            <Separator />
            <div className="flex flex-col gap-4">
              {catalogGroups.map((group) => (
                <div key={group.category}>
                  <p className="px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.category}
                  </p>
                  <nav className="mt-1 flex flex-col gap-0.5">
                    {group.items.map((item) => (
                      <SheetClose asChild key={item.slug}>
                        <Link
                          href={`/catalog/${item.slug}`}
                          className="rounded-lg px-2 py-2 text-sm text-foreground/90 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                        >
                          {item.title}
                        </Link>
                      </SheetClose>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </>
        )}

        <Separator />
        <SheetClose asChild>
          <Link
            href={signedIn ? "/account/orders" : "/sign-in"}
            className="rounded-lg px-2 py-2.5 text-[15px] font-medium text-brand-navy transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
          >
            {signedIn ? "My account" : "Sign in"}
          </Link>
        </SheetClose>
      </SheetContent>
    </Sheet>
  );
}
