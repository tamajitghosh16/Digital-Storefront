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
  /**
   * The product's front-cover scan, as of when it was added — or when the
   * cart page last refreshed it (`syncCovers`). `null`/undefined draws the
   * illustrated jacket.
   */
  imageUrl?: string | null;
}

interface CartState {
  items: CartItem[];
  /**
   * The account this cart belongs to (`User.id`), or `null` for a guest's.
   * `components/commerce/cart-sync.tsx` compares it with whoever is signed
   * in, so one account's cart is never shown to a signed-out visitor or to
   * another account using the same browser.
   */
  ownerId: string | null;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  /** Replaces each listed line's `stockQty` with a live figure (`getCartStock`), re-capping its quantity. */
  syncStock: (stock: Record<string, number | null>) => void;
  /** Replaces each listed line's `imageUrl` with the product's current cover (`getCartCovers`). */
  syncCovers: (covers: Record<string, string | null>) => void;
  /** Empties the lines, keeping the owner — after an order is placed. */
  clear: () => void;
  /** Swaps in a whole cart and its owner — an account's saved cart, or an empty guest one on sign-out. */
  replace: (items: CartItem[], ownerId: string | null) => void;
}

/** Most of an item the cart will hold: on-hand stock for a shipped line, one copy of an e-book. */
function capQuantity(item: Pick<CartItem, "fulfillmentType" | "stockQty">, quantity: number): number {
  if (item.fulfillmentType === "DIGITAL") return Math.min(quantity, 1);
  return typeof item.stockQty === "number" && item.stockQty > 0 ? Math.min(quantity, item.stockQty) : quantity;
}

/** `items` with `item` added — merged into its existing line, if any, and capped. */
export function withItem(items: CartItem[], item: CartItem): CartItem[] {
  const existing = items.find((i) => i.productId === item.productId);
  if (!existing) return [...items, { ...item, quantity: capQuantity(item, item.quantity) }];
  const stockQty = item.stockQty ?? existing.stockQty;
  const imageUrl = item.imageUrl ?? existing.imageUrl;
  const merged = existing.quantity + item.quantity;
  return items.map((i) =>
    i.productId === item.productId
      ? { ...i, stockQty, imageUrl, quantity: capQuantity({ fulfillmentType: i.fulfillmentType, stockQty }, merged) }
      : i
  );
}

// Client-side cart state (Technical Design Document, Section 1 — Zustand).
// A signed-in customer's cart is also saved to their account (the `carts`
// table) by `components/commerce/cart-sync.tsx`, so it follows them to every
// browser and device; a guest's lives in this browser only.
export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      ownerId: null,
      addItem: (item) => set((state) => ({ items: withItem(state.items, item) })),
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
      syncCovers: (covers) =>
        set((state) => {
          // Skip the write when nothing changed, so the cart doesn't re-save to the account for nothing.
          const changed = state.items.some(
            (i) => i.productId in covers && (i.imageUrl ?? null) !== (covers[i.productId] ?? null)
          );
          if (!changed) return state;
          return {
            items: state.items.map((i) => (i.productId in covers ? { ...i, imageUrl: covers[i.productId] ?? null } : i)),
          };
        }),
      clear: () => set({ items: [] }),
      replace: (items, ownerId) => set({ items, ownerId }),
    }),
    // v1: added `ownerId`. A v0 cart has no record of whose it was — it may
    // be a signed-out account's — so it's dropped rather than shown to
    // whoever is using this browser now. (Carts were browser-only until v1,
    // so there's no account copy to restore it from.)
    {
      name: "cart-storage",
      version: 1,
      migrate: (persisted, version) =>
        version < 1 ? { items: [], ownerId: null } : (persisted as Pick<CartState, "items" | "ownerId">),
    }
  )
);
