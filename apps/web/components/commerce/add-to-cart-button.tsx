"use client";
import { useState } from "react";
import { buttonClass, type ButtonSize, type ButtonVariant } from "@/components/primitives";
import { useCartStore, type CartItem } from "@/lib/cart-store";

/**
 * Single-line add for products that don't need the full buy box —
 * service packages, and anywhere a tile needs a direct action.
 */
export function AddToCartButton({
  product,
  disabled,
  label = "Add to cart",
  variant = "primary",
  size = "lg",
  className,
}: {
  product: Omit<CartItem, "quantity">;
  disabled?: boolean;
  label?: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}) {
  const addItem = useCartStore((state) => state.addItem);
  const [added, setAdded] = useState(false);

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        addItem({ ...product, quantity: 1 });
        setAdded(true);
        window.setTimeout(() => setAdded(false), 1800);
      }}
      className={buttonClass(variant, size, className)}
    >
      {added ? "Added to cart ✓" : disabled ? "Out of stock" : label}
    </button>
  );
}
