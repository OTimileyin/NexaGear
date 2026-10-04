import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";

/**
 * Applies the theme before first paint.
 *
 * This has to be a blocking inline script in the document rather than a React
 * effect: an effect runs after the browser has already painted the default
 * theme, so the visitor would see the datasheet design flash and then swap to
 * the apple one on every load. The script is a fixed string from lib/theme —
 * no interpolated user input, no network call, no secrets.
 */
export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />;
}