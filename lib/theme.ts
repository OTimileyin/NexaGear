/**
 * Theme resolution. Two visual directions exist side by side:
 *
 *   "datasheet" — the original "The Datasheet" direction in DESIGN_GUIDELINES.md
 *                 (hairline rules, mono-for-data, square corners).
 *   "apple"     — an alternate treatment: near-white surfaces, rounded geometry,
 *                 hairline rules replaced by subtle surface shifts, system sans
 *                 instead of Archivo, no annotation strips.
 *
 * This module is deliberately free of DOM and React so the resolution order can
 * be unit-tested (see tests/theme.test.ts) — a theme that resolves wrongly is
 * not a cosmetic bug, it silently ships the wrong design to a reviewer.
 */

/** Query parameter and localStorage key, both public and stable. */
export const THEME_QUERY_PARAM = "theme";
export const SCHEME_QUERY_PARAM = "scheme";
export const THEME_STORAGE_KEY = "nexagear.theme";
export const SCHEME_STORAGE_KEY = "nexagear.scheme";

export const THEMES = ["datasheet", "apple"] as const;
export type Theme = (typeof THEMES)[number];

/**
 * `auto` follows the operating system. `light` and `dark` are explicit choices.
 * Only `light` and `dark` ever reach the DOM attribute — `auto` is resolved to
 * one of them before paint — because the stylesheet keys off a concrete scheme
 * and needs no media queries to do so.
 */
export const SCHEMES = ["auto", "light", "dark"] as const;
export type Scheme = (typeof SCHEMES)[number];

/** A scheme after `auto` has been resolved against the system preference. */
export type ResolvedScheme = "light" | "dark";

/** The shipped design. A visitor with no preference sees this. */
export const DEFAULT_THEME: Theme = "datasheet";
export const DEFAULT_SCHEME: Scheme = "auto";

export const THEME_LABELS: Record<Theme, string> = {
  datasheet: "Datasheet",
  apple: "Apple",
};

export const SCHEME_LABELS: Record<Scheme, string> = {
  auto: "Auto",
  light: "Light",
  dark: "Dark",
};

/** Type guard — anything not in THEMES is treated as "no preference". */
export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/** Type guard for the scheme, which accepts `auto` as well as the two modes. */
export function isScheme(value: unknown): value is Scheme {
  return (
    typeof value === "string" && (SCHEMES as readonly string[]).includes(value)
  );
}

/**
 * Reads `?theme=` out of a query string.
 *
 * Returns null when the parameter is absent or not a known theme.
 */
export function themeFromSearch(search: string): Theme | null {
  let value: string | null = null;
  try {
    value = new URLSearchParams(search).get(THEME_QUERY_PARAM);
  } catch {
    return null;
  }
  return isTheme(value) ? value : null;
}

/** Reads `?scheme=`; null when absent or not one of auto/light/dark. */
export function schemeFromSearch(search: string): Scheme | null {
  let value: string | null = null;
  try {
    value = new URLSearchParams(search).get(SCHEME_QUERY_PARAM);
  } catch {
    return null;
  }
  return isScheme(value) ? value : null;
}

/**
 * Scheme resolution, mirroring the theme rules exactly: explicit parameter,
 * then remembered choice, then follow the system.
 *
 * A present-but-invalid `?scheme=` resolves to `auto` rather than to stored
 * state, for the same reason `?theme=` does — a broken link must be
 * deterministic for whoever opens it.
 */
export function resolveScheme(search: string, stored: string | null): Scheme {
  const fromSearch = schemeFromSearch(search);
  if (fromSearch) return fromSearch;
  try {
    if (new URLSearchParams(search).has(SCHEME_QUERY_PARAM)) {
      return DEFAULT_SCHEME;
    }
  } catch {
    return DEFAULT_SCHEME;
  }
  if (isScheme(stored)) return stored;
  return DEFAULT_SCHEME;
}

/** Collapses `auto` to the concrete scheme the stylesheet should apply. */
export function resolveSchemeToMode(
  scheme: Scheme,
  prefersDark: boolean,
): ResolvedScheme {
  if (scheme === "light") return "light";
  if (scheme === "dark") return "dark";
  return prefersDark ? "dark" : "light";
}

/**
 * True when `?theme=` is present at all, whether or not the value is valid.
 *
 * The two cases are deliberately distinguishable. An absent parameter means
 * "use whatever this visitor last chose". A present-but-invalid one means the
 * link is broken, and resolving that to stored state would silently show a
 * different design than the link asks for.
 */
export function hasThemeParam(search: string): boolean {
  try {
    return new URLSearchParams(search).has(THEME_QUERY_PARAM);
  } catch {
    return false;
  }
}

/**
 * Resolution order: explicit parameter, then remembered choice, then default.
 *
 * The parameter wins so a link can carry a theme to someone who has never seen
 * the site. Remembered state comes second so the theme survives client-side
 * navigation — `Link` to `/shop` drops the query string, and without storage the
 * comparison mode would reset on every click.
 */
export function resolveTheme(search: string, stored: string | null): Theme {
  if (hasThemeParam(search)) {
    // Present but unrecognised resolves to the shipped design rather than to
    // stored state, so a malformed link is deterministic.
    return themeFromSearch(search) ?? DEFAULT_THEME;
  }
  if (isTheme(stored)) return stored;
  return DEFAULT_THEME;
}

/**
 * Inline script that applies the theme AND scheme before first paint.
 *
 * Rendered into the document head as a blocking script on purpose: doing this
 * in a React effect would paint the light default first and then repaint, which
 * is a visible flash on every load — and for a visitor whose OS is dark that
 * flash is the brightest thing on screen. The script reads `matchMedia` itself
 * so `auto` resolves to a concrete `data-scheme` before the first pixel.
 *
 * It only writes two attributes. It holds no secret, contacts no network, and
 * is written as a string with no interpolation beyond our own constants.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{
var r=document.documentElement,s=new URLSearchParams(location.search);
var tq=s.get(${JSON.stringify(THEME_QUERY_PARAM)});
var t=null;
if(tq!==null){t=(tq==="datasheet"||tq==="apple")?tq:${JSON.stringify(DEFAULT_THEME)}}
else{try{t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)})}catch(e){}}
if(t!=="datasheet"&&t!=="apple"){t=${JSON.stringify(DEFAULT_THEME)}}
r.setAttribute("data-theme",t);
var q=s.get(${JSON.stringify(SCHEME_QUERY_PARAM)});
var sc=null;
if(q!==null){sc=(q==="auto"||q==="light"||q==="dark")?q:"auto"}
else{try{sc=localStorage.getItem(${JSON.stringify(SCHEME_STORAGE_KEY)})}catch(e){}}
if(sc!=="auto"&&sc!=="light"&&sc!=="dark"){sc="auto"}
var dark=false;
try{dark=window.matchMedia("(prefers-color-scheme: dark)").matches}catch(e){}
// The preference is kept separate from the resolved mode: the stylesheet keys
// off the concrete value, while the control has to show "Auto" as selected
// rather than silently relabelling it "Light".
r.setAttribute("data-scheme-preference",sc);
r.setAttribute("data-scheme",sc==="auto"?(dark?"dark":"light"):sc);
}catch(e){}})();`;

/** The attribute value Tailwind's `apple:` variant and the CSS selectors read. */
export function themeAttribute(theme: Theme): string {
  return theme;
}

/** Attribute names, so components never hard-code the strings. */
export const THEME_ATTR = "data-theme";
export const SCHEME_ATTR = "data-scheme";
export const SCHEME_PREFERENCE_ATTR = "data-scheme-preference";