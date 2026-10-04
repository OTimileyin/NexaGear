"use client";

import { useCallback } from "react";

import {
  THEME_ATTR,
  THEME_QUERY_PARAM,
  THEME_STORAGE_KEY,
  THEMES,
  THEME_LABELS,
  isTheme,
  type Theme,
} from "@/lib/theme";
import { useHtmlAttribute } from "@/lib/use-html-attribute";

/**
 * Switches between the two design directions.
 *
 * The chosen theme is written to three places on purpose:
 *   localStorage  — survives navigation, since a `Link` to /shop would
 *                   otherwise drop `?theme=` and silently reset the view.
 *   the DOM attribute — what the CSS and the `apple:` variant actually read.
 *   the query string — so the current view is shareable, which is the whole
 *                   point of running two designs side by side.
 *
 * Rendered as two radio buttons rather than a toggle switch: the visitor is
 * choosing between two named designs, not flipping a boolean, and a switch
 * would hide the alternative they are not currently looking at.
 */
export function ThemeToggle() {
  // See useHtmlAttribute for why this is read from the DOM rather than local
  // React state: the bootstrap script applies the theme before React runs.
  const current = useHtmlAttribute(THEME_ATTR);
  const theme = isTheme(current) ? current : null;

  const choose = useCallback((next: Theme) => {
    // Writing the attribute is what triggers the observer behind
    // useHtmlAttribute, so there is no separate setState here.
    document.documentElement.setAttribute(THEME_ATTR, next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode or a blocked store. The theme still applies for this
      // page view; it just will not be remembered next time.
    }
    const url = new URL(window.location.href);
    url.searchParams.set(THEME_QUERY_PARAM, next);
    // replaceState rather than push so switching themes does not fill the
    // back button with theme changes.
    window.history.replaceState(null, "", url);
  }, []);

  return (
    <fieldset className="flex items-center gap-1.5">
      <legend className="sr-only">Choose a design direction</legend>
      {THEMES.map((option) => {
        const selected = theme === option;
        return (
          <label
            key={option}
            className={`cursor-pointer rounded-full border px-2.5 py-1 text-[11px] leading-none transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-drafting ${
              selected
                ? "border-transparent bg-ink text-paper apple:border-transparent apple:bg-signal apple:text-paper"
                : "border-ink/30 text-steel hover:text-ink apple:border-ink/20 apple:bg-surface"
            }`}
          >
            <input
              type="radio"
              name="theme"
              value={option}
              checked={selected}
              onChange={() => choose(option)}
              className="sr-only"
            />
            {THEME_LABELS[option]}
          </label>
        );
      })}
    </fieldset>
  );
}