"use client";

import { useCallback, useEffect } from "react";

import {
  SCHEMES,
  SCHEME_ATTR,
  SCHEME_LABELS,
  SCHEME_PREFERENCE_ATTR,
  SCHEME_QUERY_PARAM,
  SCHEME_STORAGE_KEY,
  isScheme,
  type Scheme,
} from "@/lib/theme";
import { useHtmlAttribute } from "@/lib/use-html-attribute";

/**
 * Picks the colour scheme: follow the system, or force light or dark.
 *
 * `auto` is a live subscription, not a one-time read. If the visitor leaves the
 * page open and their OS flips to dark at sunset, the page follows — otherwise
 * "Auto" would quietly mean "whatever it was when you loaded".
 */
export function SchemeToggle() {
  const preference = useHtmlAttribute(SCHEME_PREFERENCE_ATTR);
  const scheme: Scheme | null = isScheme(preference) ? preference : null;

  // Only active while the visitor is actually following the system. The
  // listener is added and removed with the preference rather than mounted
  // permanently, so an explicit choice costs nothing.
  useEffect(() => {
    if (scheme !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = (matches: boolean) => {
      document.documentElement.setAttribute(
        SCHEME_ATTR,
        matches ? "dark" : "light",
      );
    };
    apply(media.matches);
    media.addEventListener("change", onMediaChange);
    function onMediaChange(event: MediaQueryListEvent) {
      apply(event.matches);
    }
    return () => media.removeEventListener("change", onMediaChange);
  }, [scheme]);

  const choose = useCallback((next: Scheme) => {
    document.documentElement.setAttribute(SCHEME_PREFERENCE_ATTR, next);
    // Resolve immediately rather than waiting for the effect above, so the
    // click repaints on the same frame.
    const dark =
      next === "dark" ||
      (next === "auto" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.setAttribute(SCHEME_ATTR, dark ? "dark" : "light");

    try {
      window.localStorage.setItem(SCHEME_STORAGE_KEY, next);
    } catch {
      // Private mode or a blocked store: the scheme still applies for this
      // page view, it just will not be remembered next time.
    }
    const url = new URL(window.location.href);
    url.searchParams.set(SCHEME_QUERY_PARAM, next);
    // replaceState so switching scheme does not fill the back button.
    window.history.replaceState(null, "", url);
  }, []);

  return (
    <fieldset className="flex items-center gap-1">
      <legend className="sr-only">Choose a colour scheme</legend>
      {SCHEMES.map((option) => {
        const selected = scheme === option;
        return (
          <label
            key={option}
            className={`cursor-pointer rounded-full border px-2 py-1 text-[11px] leading-none transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-drafting ${
              selected
                ? "border-transparent bg-ink text-paper apple:bg-signal apple:text-paper"
                : "border-ink/30 text-steel hover:text-ink apple:border-ink/20 apple:bg-surface"
            }`}
          >
            <input
              type="radio"
              name="scheme"
              value={option}
              checked={selected}
              onChange={() => choose(option)}
              className="sr-only"
            />
            {SCHEME_LABELS[option]}
          </label>
        );
      })}
    </fieldset>
  );
}