"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUserRound, LogOut, LayoutDashboard, Library, Package } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/dropdown-menu";
import { Button } from "@repo/ui/button";
import { createClient } from "@repo/auth/client";

export interface AccountMenuUser {
  name: string | null;
  email: string;
  role: string;
}

// Server component (site-header.tsx) fetches the user; this client component
// only handles the interactive dropdown + sign-out.
export function AccountMenu({ user }: { user: AccountMenuUser | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (!user) {
    return (
      <Button asChild variant="outline" size="sm">
        <Link href="/sign-in">Sign in</Link>
      </Button>
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
        <button
          aria-label="Account menu"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
        >
          <CircleUserRound className="h-[19px] w-[19px]" strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="truncate">{user.name || user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account/orders">
            <Package className="h-4 w-4" /> Order history
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/account/library">
            <Library className="h-4 w-4" /> Digital library
          </Link>
        </DropdownMenuItem>
        {user.role === "SELF_PUB_AUTHOR" && (
          <DropdownMenuItem asChild>
            <Link href="/account/publishing">
              <LayoutDashboard className="h-4 w-4" /> Publishing dashboard
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
