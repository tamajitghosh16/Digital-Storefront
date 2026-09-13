"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  productId: string;
  title: string;
  /** What the customer pays per unit, after any bundle saving. */
  priceCents: number;
  quantity: number;
  fulfillmentType: "SHIP" | "DIGITAL" | "SERVICE";
  /** Undiscounted per-unit price, so the cart can show what was saved. */
  listPriceCents?: number;
  /** Drives the GST already included in `priceCents` — see lib/pricing.ts. */
  taxType?: "PHYSICAL_BOOK" | "EBOOK" | "SERVICE_PACKAGE";
  /** One line of fulfilment detail under the title. */
  note?: string;
  /** Units on hand for a `SHIP` line, as of when it was added. `null`/undefined = not tracked. */
  stockQty?: number | null;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
}

// Client-side cart state (Technical Design Document, Section 1 — Zustand).
// Logged-in users' carts are additionally persisted server-side on checkout.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.productId === item.productId);
          if (existing) {
            const stockQty = item.stockQty ?? existing.stockQty;
            const merged = existing.quantity + item.quantity;
            return {
              items: state.items.map((i) =>
                i.productId === item.productId
                  ? {
                      ...i,
                      stockQty,
                      quantity: typeof stockQty === "number" && stockQty > 0 ? Math.min(merged, stockQty) : merged,
                    }
                  : i
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (productId) => set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId
                    ? {
                        ...i,
                        quantity:
                          typeof i.stockQty === "number" && i.stockQty > 0
                            ? Math.min(quantity, i.stockQty)
                            : quantity,
                      }
                    : i
                ),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "cart-storage" }
  )
);
