// @vitest-environment jsdom
// jsdom for `localStorage`, which the store's persist middleware writes to.
import { beforeEach, describe, expect, it } from "vitest";
import { type CartItem, useCartStore, withItem } from "@/lib/cart-store";

const paperback: CartItem = {
  productId: "book-1:paperback",
  title: "A Paperback",
  priceCents: 49_900,
  quantity: 1,
  fulfillmentType: "SHIP",
  stockQty: 5,
};

const ebook: CartItem = {
  productId: "book-1:ebook",
  title: "An E-book",
  priceCents: 19_900,
  quantity: 1,
  fulfillmentType: "DIGITAL",
};

describe("withItem", () => {
  it("adds a new line", () => {
    expect(withItem([], paperback)).toEqual([paperback]);
  });

  it("merges a repeat add into the existing line", () => {
    const items = withItem(withItem([], paperback), { ...paperback, quantity: 2 });
    expect(items).toHaveLength(1);
    expect(items[0]!.quantity).toBe(3);
  });

  it("caps a shipped line at the stock on hand", () => {
    const items = withItem([], { ...paperback, quantity: 9 });
    expect(items[0]!.quantity).toBe(5);
  });

  it("doesn't cap a line whose stock isn't tracked", () => {
    const items = withItem([], { ...paperback, quantity: 9, stockQty: null });
    expect(items[0]!.quantity).toBe(9);
  });

  it("holds at most one copy of an e-book", () => {
    const items = withItem(withItem([], ebook), ebook);
    expect(items[0]!.quantity).toBe(1);
  });
});

describe("useCartStore", () => {
  beforeEach(() => useCartStore.setState({ items: [], ownerId: null }));

  it("removes a line when its quantity is set to zero", () => {
    const { addItem, updateQuantity } = useCartStore.getState();
    addItem(paperback);
    updateQuantity(paperback.productId, 0);
    expect(useCartStore.getState().items).toEqual([]);
  });

  it("re-caps quantities when live stock drops", () => {
    const { addItem, syncStock } = useCartStore.getState();
    addItem({ ...paperback, quantity: 4 });
    syncStock({ [paperback.productId]: 2 });
    expect(useCartStore.getState().items[0]).toMatchObject({ quantity: 2, stockQty: 2 });
  });

  it("keeps the owner when cleared after an order", () => {
    useCartStore.getState().replace([paperback], "user-1");
    useCartStore.getState().clear();
    expect(useCartStore.getState()).toMatchObject({ items: [], ownerId: "user-1" });
  });
});
