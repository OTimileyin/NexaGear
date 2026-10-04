"use client";

import { useAuth } from "@clerk/nextjs";
import { useEffect, useRef } from "react";

import { ServerCartBridge } from "@/lib/cart/server-bridge";
import { cartStore } from "@/lib/cart/store";
import { createBrowserSupabase } from "@/lib/supabase/browser";

/**
 * Connects the cart store to the account's server cart.
 *
 * This exists because the store cannot know who is signed in — Clerk lives in
 * React, and the store deliberately does not. So one component owns the
 * translation: on sign-in it merges any guest cart, loads the account cart, and
 * subscribes to changes; on sign-out it detaches and the store falls back to
 * localStorage.
 *
 * Renders nothing. It is mounted inside `ClerkProvider` in the root layout, so
 * it covers every route including the cart sheet, which has no page of its own.
 *
 * WHY BOTH A LOAD AND A SUBSCRIPTION: a subscription alone only reports changes
 * that happen while the page is open. Opening the site after adding an item on
 * the phone would show an empty cart — the exact failure the Lesson 3 demo is
 * looking for, and one that no amount of "it worked when I tried it" catches.
 */
export function CartSync() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();

  // `getToken` is not guaranteed to keep its identity between renders, and this
  // effect tears the cart down on cleanup. Depending on it directly would
  // detach and re-attach the server cart on every render, which shows up as the
  // cart emptying and refilling. A ref keeps the token fresh without making the
  // effect depend on it.
  const getTokenRef = useRef(getToken);
  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      cartStore.detachServer();
      return;
    }

    const supabase = createBrowserSupabase(() => getTokenRef.current());
    if (!supabase) return;

    const bridge = new ServerCartBridge(supabase, userId);
    let cancelled = false;

    // Subscribe first so a change arriving during the initial load is not lost.
    const unsubscribe = bridge.subscribe((items) => {
      if (!cancelled) cartStore.applyServerItems(items);
    });

    void (async () => {
      try {
        // Merge BEFORE loading: the merged result is the account's cart, so
        // loading first would flash a cart that is missing the guest items.
        await bridge.mergeGuest(cartStore.guestItems());
        const items = await bridge.load();
        if (cancelled) return;
        cartStore.attachServer(bridge, items);
      } catch {
        // Server cart unreachable — the local cart keeps working rather than
        // the page breaking. The next load reconciles.
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe();
      cartStore.detachServer();
    };
  }, [isLoaded, isSignedIn, userId]);

  return null;
}
