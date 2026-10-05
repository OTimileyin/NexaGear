import { useColorScheme } from "react-native";

/**
 * The phone uses the website's *apple* palette, not the datasheet one.
 *
 * Those hexes are not invented here: `app/globals.css` defines them and
 * `scripts/color-contrast-audit.mjs` measures every one of them for WCAG AA —
 * `#0058b8` on white and `#409cff` on black are the darkened/brightened Apple
 * hues that pass, and are deliberately not Apple's published `#007AFF` (4.02:1)
 * or `#34C759` (2.22:1), which fail as text. Copying the failing originals into
 * the app "because it looks more Apple" would undo a measured decision.
 *
 * The scheme follows the OS setting rather than being fixed, because a phone
 * that ignores dark mode is showing white light into someone's eyes at night.
 */
export interface Theme {
  scheme: "light" | "dark";
  paper: string;
  surface: string;
  ink: string;
  drafting: string;
  signal: string;
  steel: string;
  stock: string;
  border: string;
}

const light: Theme = {
  scheme: "light",
  paper: "#ffffff",
  surface: "#f5f5f7",
  ink: "#1d1d1f",
  drafting: "#0058b8",
  signal: "#0058b8",
  steel: "#5b5b60",
  stock: "#1c6b3f",
  border: "#d2d2d7",
};

const dark: Theme = {
  scheme: "dark",
  paper: "#000000",
  surface: "#1c1c1e",
  ink: "#f5f5f7",
  drafting: "#409cff",
  signal: "#409cff",
  steel: "#a1a1a6",
  stock: "#3fbf6b",
  border: "#3a3a3c",
};

export function useTheme(): Theme {
  return useColorScheme() === "dark" ? dark : light;
}
