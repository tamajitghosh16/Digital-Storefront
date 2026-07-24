"use client";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";

// Client-only: reads the Zustand cart store, which isn't available during SSR.
export function CartIndicator() {
  const count = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <Link
      href="/cart"
      aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted"
    >
      <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.75} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-accent-solid px-1 text-[10px] font-semibold leading-none text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
