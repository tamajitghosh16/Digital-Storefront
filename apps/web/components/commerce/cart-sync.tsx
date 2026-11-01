"use client";
import { useEffect } from "react";
import { getSavedCart, saveCart } from "@/lib/actions/cart";
import { useCartStore, withItem, type CartItem } from "@/lib/cart-store";
import { useCheckoutStore } from "@/lib/checkout-store";

/**
 * Ties the browser's cart (`lib/cart-store.ts`) to whoever is signed in.
 * `userId` comes from the root layout, which re-renders on sign-in and
 * sign-out (both `router.refresh()`), so this re-runs on every change of
 * account as well as on each full page load.
 *
 * - Signed in: the account's saved cart replaces whatever this browser
 *   remembered for it — the account copy is the one other devices write to.
 *   A guest cart built up before signing in is merged into it, not lost.
 *   From then on every change is saved back to the account.
 * - Signed out: a cart that belonged to an account is emptied, so it isn't
 *   left showing after sign-out (or after the session lapses). A guest's own
 *   cart is left alone.
 * - Another account signs in on this browser: the previous account's cart
 *   (and its checkout details) are dropped before the new one loads.
 *
 * The account copy is pulled again whenever the tab comes back into view,
 * so a cart changed on another device shows up without a reload.
 */

const SAVE_DELAY_MS = 400;

export function CartSync({ userId }: { userId: string | null }) {
  useEffect(() => {
    const store = useCartStore;
    let active = true;
    // True while this component itself writes the store, so the change
    // listener doesn't save a cart it has just loaded from the account.
    let applying = false;
    let loaded = false;
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    let saving: Promise<unknown> = Promise.resolve();

    function apply(items: CartItem[], ownerId: string | null) {
      applying = true;
      store.getState().replace(items, ownerId);
      applying = false;
    }

    function save(items: CartItem[]) {
      // Chained so an older cart can never land after a newer one.
      saving = saving.then(() => saveCart(items)).catch(() => {});
    }

    /** Saves a pending change now — the tab is being hidden or closed. */
    function flush() {
      if (saveTimer === undefined) return;
      clearTimeout(saveTimer);
      saveTimer = undefined;
      if (userId && store.getState().ownerId === userId) save(store.getState().items);
    }

    const unsubscribe = store.subscribe((state, prev) => {
      if (applying || !loaded || !userId || state.ownerId !== userId || state.items === prev.items) return;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => {
        saveTimer = undefined;
        save(store.getState().items);
      }, SAVE_DELAY_MS);
    });

    async function pull() {
      // Don't overwrite a change that hasn't reached the account yet.
      if (saveTimer !== undefined) return;
      await saving;
      const before = store.getState().items;
      const saved = await getSavedCart().catch(() => null);
      if (!active || saved === null || saveTimer !== undefined) return;

      const { items, ownerId } = store.getState();
      if (ownerId === userId && items !== before) {
        // Changed here while the account copy was loading: this is newer.
        loaded = true;
        save(items);
      } else if (ownerId === null && items.length > 0) {
        // A guest cart from before signing in joins the account's.
        const merged = items.reduce(withItem, saved);
        apply(merged, userId);
        save(merged);
      } else {
        apply(saved, userId);
      }
      loaded = true;
    }

    function start() {
      const { ownerId } = store.getState();
      if (ownerId !== null && ownerId !== userId) {
        // Signed out, or someone else signed in: this account's cart and
        // delivery details must not be shown to them.
        apply([], null);
        useCheckoutStore.getState().clear();
      }
      if (userId) void pull();
    }

    function onVisibilityChange() {
      if (!userId) return;
      if (document.visibilityState === "visible") void pull();
      else flush();
    }

    if (store.persist.hasHydrated()) start();
    const unsubscribeHydration = store.persist.onFinishHydration(start);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flush);

    return () => {
      // Not flushed: by now the session cookie may already be the next
      // account's (or gone), and a save would land on the wrong cart.
      active = false;
      clearTimeout(saveTimer);
      unsubscribe();
      unsubscribeHydration();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flush);
    };
  }, [userId]);

  return null;
}
