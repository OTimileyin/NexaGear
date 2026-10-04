/**
 * Proves the dark-scheme tokens actually reach the browser.
 *
 * The dark palettes exist only in app/globals.css. TypeScript cannot see them,
 * and no unit test imports them, so if Tailwind ever stopped emitting those
 * blocks the dark mode would silently fall back to the light palette while
 * every other gate stayed green — text would go from black-on-cream to
 * black-on-black with no error anywhere.
 *
 * Requires a build first, because the assertion is against compiled CSS.
 *
 *   npm run build && node scripts/check-appearance-tokens.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Next 16 emits compiled CSS into .next/static/chunks; older builds used
// .next/static/css. Search the whole static tree so a build-layout change does
// not turn this into a false negative.
const CSS_DIR = ".next/static";

/** Hexes that only exist in a dark-scheme block. */
const DARK_ONLY_HEXES = [
  "#16181c", // datasheet/dark paper
  "#1f2228", // datasheet/dark surface
  "#e9e7e1", // datasheet/dark ink
  "#8ab4f8", // datasheet/dark drafting
  "#ff8a5b", // datasheet/dark signal
  "#a7adb6", // datasheet/dark steel
  "#5fd39a", // datasheet/dark stock
  "#1c1c1e", // apple/dark surface
  "#409cff", // apple/dark drafting + signal
  "#a1a1a6", // apple/dark steel
  "#3fbf6b", // apple/dark stock
];

function cssFiles(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) found.push(...cssFiles(path));
    else if (path.endsWith(".css")) found.push(path);
  }
  return found;
}

let css;
let fileCount = 0;
try {
  const files = cssFiles(CSS_DIR);
  if (files.length === 0) throw new Error("no css files");
  fileCount = files.length;
  css = files.map((f) => readFileSync(f, "utf8")).join("\n");
} catch {
  console.error(
    `No compiled CSS under ${CSS_DIR}. Run \`npm run build\` first.`,
  );
  process.exit(2);
}

console.log(
  `Compiled CSS: ${CSS_DIR} (${fileCount} file(s), ${(css.length / 1024).toFixed(0)} kB)`,
);

let failed = 0;

// Tailwind minifies and rewrites quotes in selectors, so match the unquoted
// form. `:root[data-scheme=dark]` is what the compiler emits.
const selectors = [
  ':root[data-scheme=dark]',
  ':root[data-theme=apple]',
  ':root[data-theme=apple][data-scheme=dark]',
];
for (const selector of selectors) {
  const found = css.includes(selector);
  if (!found) failed += 1;
  console.log(`  ${found ? "PASS" : "FAIL"}  selector ${selector}`);
}

// color-scheme is what makes the browser's own UI — scrollbars, form controls —
// match the page. Without it a dark page still gets a white scrollbar.
for (const declaration of ["color-scheme:dark", "color-scheme:light"]) {
  const found = css.replace(/\s+/g, "").includes(declaration);
  if (!found) failed += 1;
  console.log(`  ${found ? "PASS" : "FAIL"}  ${declaration}`);
}

for (const hex of DARK_ONLY_HEXES) {
  const found = css.toLowerCase().includes(hex);
  if (!found) failed += 1;
  console.log(`  ${found ? "PASS" : "FAIL"}  dark token ${hex}`);
}

if (failed > 0) {
  console.error(
    `\n${failed} appearance token(s) missing from the compiled CSS. ` +
      "Dark mode would silently fall back to the light palette.",
  );
  process.exit(1);
}
console.log("\nBoth dark palettes and color-scheme survived compilation.");
