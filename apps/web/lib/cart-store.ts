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
  /**
   * Units on hand for a `SHIP` line, as of when it was added — or when the
   * cart page last refreshed it (`syncStock`). `null`/undefined = not tracked.
   */
  stockQty?: number | null;
}

interface CartState {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  /** Replaces each listed line's `stockQty` with a live figure (`getCartStock`), re-capping its quantity. */
  syncStock: (stock: Record<string, number | null>) => void;
  clear: () => void;
}

/** Most of an item the cart will hold: on-hand stock for a shipped line, one copy of an e-book. */
function capQuantity(item: Pick<CartItem, "fulfillmentType" | "stockQty">, quantity: number): number {
  if (item.fulfillmentType === "DIGITAL") return Math.min(quantity, 1);
  return typeof item.stockQty === "number" && item.stockQty > 0 ? Math.min(quantity, item.stockQty) : quantity;
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
                  ? { ...i, stockQty, quantity: capQuantity({ fulfillmentType: i.fulfillmentType, stockQty }, merged) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: capQuantity(item, item.quantity) }] };
        }),
      removeItem: (productId) => set((state) => ({ items: state.items.filter((i) => i.productId !== productId) })),
      updateQuantity: (productId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity: capQuantity(i, quantity) } : i
                ),
        })),
      syncStock: (stock) =>
        set((state) => ({
          items: state.items.map((i) => {
            if (!(i.productId in stock)) return i;
            const stockQty = stock[i.productId] ?? null;
            return { ...i, stockQty, quantity: capQuantity({ fulfillmentType: i.fulfillmentType, stockQty }, i.quantity) };
          }),
        })),
      clear: () => set({ items: [] }),
    }),
    { name: "cart-storage" }
  )
);
