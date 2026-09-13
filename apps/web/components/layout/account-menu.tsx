"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CircleUserRound,
  Heart,
  LayoutDashboard,
  Library,
  LogIn,
  LogOut,
  Package,
  UserRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { createClient } from "@repo/auth/client";
import { ICON_BUTTON_CLASS, ICON_LABEL_CLASS } from "./icon-button";

export interface AccountMenuUser {
  name: string | null;
  email: string;
  role: string;
}

// The four account destinations every reader gets, in the order the
// masthead dropdown lists them. Guests see the same list — the pages
// themselves bounce an unauthenticated visitor to /sign-in.
const ACCOUNT_LINKS = [
  { href: "/account/details", label: "Account details", icon: UserRound },
  { href: "/account/library", label: "My Library", icon: Library },
  { href: "/account/orders", label: "My Orders", icon: Package },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
] as const;

// The header (a Server Component) fetches the user; this only owns the
// dropdown and the sign-out call.
export function AccountMenu({ user }: { user: AccountMenuUser | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  function handleSignOut() {
    startTransition(async () => {
      const supabase = createClient();
      await supabase.auth.signOut();
      setOpen(false);
      router.refresh();
      router.push("/");
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label="My Account" className={ICON_BUTTON_CLASS}>
          <span className="text-lg leading-none">
            <CircleUserRound className="h-[22px] w-[22px]" strokeWidth={1.9} />
          </span>
          <span className={ICON_LABEL_CLASS}>My Account</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="rounded-tile">
        <DropdownMenuLabel className="truncate">{user ? user.name || user.email : "My Account"}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) => (
          <DropdownMenuItem key={href} asChild>
            <Link href={href}>
              <Icon className="h-4 w-4" /> {label}
            </Link>
          </DropdownMenuItem>
        ))}

        {user?.role === "SELF_PUB_AUTHOR" && (
          <DropdownMenuItem asChild>
            <Link href="/account/publishing">
              <LayoutDashboard className="h-4 w-4" /> Publishing
            </Link>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />
        {user ? (
          <DropdownMenuItem destructive onSelect={handleSignOut} disabled={isPending}>
            <LogOut className="h-4 w-4" /> {isPending ? "Signing out…" : "Sign out"}
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/sign-in">
              <LogIn className="h-4 w-4" /> Sign in
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
