"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUserRound, LayoutDashboard, Library, LogOut, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { createClient } from "@repo/auth/client";
import { ICON_BUTTON_CLASS, ICON_LABEL_CLASS, IconButtonLink } from "./icon-button";

export interface AccountMenuUser {
  name: string | null;
  email: string;
  role: string;
}

// The header (a Server Component) fetches the user; this only owns the
// dropdown and the sign-out call.
export function AccountMenu({ user }: { user: AccountMenuUser | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <IconButtonLink href="/sign-in" label="Sign in">
        <CircleUserRound className="h-[22px] w-[22px]" strokeWidth={1.9} />
      </IconButtonLink>
    );
  }

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
        <button type="button" aria-label="Account menu" className={ICON_BUTTON_CLASS}>
          <span className="text-lg leading-none">
            <CircleUserRound className="h-[22px] w-[22px]" strokeWidth={1.9} />
          </span>
          <span className={ICON_LABEL_CLASS}>Account</span>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="rounded-tile">
        <DropdownMenuLabel className="truncate">{user.name || user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/library">
            <Library className="h-4 w-4" /> Digital library
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <Package className="h-4 w-4" /> Orders
          </Link>
        </DropdownMenuItem>
        {user.role === "SELF_PUB_AUTHOR" && (
          <DropdownMenuItem asChild>
            <Link href="/account/publishing">
              <LayoutDashboard className="h-4 w-4" /> Publishing
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={handleSignOut} disabled={isPending}>
          <LogOut className="h-4 w-4" /> {isPending ? "Signing out…" : "Sign out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
