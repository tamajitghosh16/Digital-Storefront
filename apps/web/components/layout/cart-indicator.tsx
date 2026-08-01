"use client";
import { ShoppingBag } from "lucide-react";
import { useCartStore } from "@/lib/cart-store";
import { IconBadge, ICON_BUTTON_CLASS, ICON_LABEL_CLASS } from "./icon-button";
import Link from "next/link";

// Client-only: reads the Zustand cart store, which has no value during SSR.
export function CartIndicator() {
  const count = useCartStore((state) => state.items.reduce((sum, item) => sum + item.quantity, 0));

  return (
    <Link href="/cart" aria-label={`Cart, ${count} item${count === 1 ? "" : "s"}`} className={ICON_BUTTON_CLASS}>
      <span className="relative text-lg leading-none">
        <ShoppingBag className="h-[18px] w-[18px]" strokeWidth={1.9} />
        {count > 0 && <IconBadge>{count > 99 ? "99+" : count}</IconBadge>}
      </span>
      <span className={ICON_LABEL_CLASS}>Cart</span>
    </Link>
  );
}
