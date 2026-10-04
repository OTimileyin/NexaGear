"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Subscribes to an attribute on the root element.
 *
 * The appearance attributes are a real external store: they are written by the
 * pre-paint bootstrap script before React runs, and again by the controls
 * themselves. Reading them with useState + useEffect would mean a synchronous
 * setState inside an effect, which React flags as a cascading render, and would
 * still miss the value the script already applied.
 *
 * useSyncExternalStore is built for exactly this. The server snapshot is null so
 * server and client render agree and hydration does not mismatch, and the
 * MutationObserver keeps the control in step with the attribute even when
 * something other than the control wrote it.
 */
export function useHtmlAttribute(attribute: string): string | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const observer = new MutationObserver(onStoreChange);
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: [attribute],
      });
      return () => observer.disconnect();
    },
    [attribute],
  );

  const getSnapshot = () => document.documentElement.getAttribute(attribute);
  // Runs on the server, where there is no document and nothing applied yet.
  const getServerSnapshot = () => null;

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
