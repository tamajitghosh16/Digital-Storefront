"use client";
import { useState } from "react";
import { Check, ShoppingBag } from "lucide-react";
import { Button } from "@repo/ui/button";
import { useCartStore, type CartItem } from "@/lib/cart-store";

export function AddToCartButton({
  product,
  disabled,
  className,
}: {
  product: Omit<CartItem, "quantity">;
  disabled?: boolean;
  className?: string;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);

  function handleClick() {
    addItem({ ...product, quantity: 1 });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <Button size="lg" disabled={disabled} onClick={handleClick} className={className}>
      {added ? (
        <>
          <Check className="h-4 w-4" /> Added to cart
        </>
      ) : (
        <>
          <ShoppingBag className="h-4 w-4" /> {disabled ? "Out of stock" : "Add to cart"}
        </>
      )}
    </Button>
  );
}
