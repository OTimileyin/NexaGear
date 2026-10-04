/**
 * Proves the `apple:` variant is real, not silently dropped.
 *
 * Tailwind treats an unknown variant as a no-op: `apple:rounded-2xl` would be
 * discarded with no error, the page would build, and the theme would appear to
 * work while doing nothing. Nothing in the type system or the build would catch
 * that, so this greps the compiled stylesheet for the utilities the components
 * actually use.
 *
 *   npm run build && node scripts/check-apple-variant.mjs
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Next 16 emits compiled CSS into .next/static/chunks; older builds used
// .next/static/css. Search the whole static tree so this check does not become
// a false negative on a build-layout change.
const CSS_DIR = ".next/static";

/**
 * Each entry is a plain substring, not a regex. Tailwind escapes the colon when
 * it writes the selector (`apple\:rounded-full:where(...)`), and a regex here
 * silently matches nothing — which reads as "the variant is broken" when the
 * variant is actually fine. Substring matching cannot get that wrong.
 */
const REQUIRED = [
  "apple\\:rounded-full",
  "apple\\:rounded-2xl",
  "apple\\:rounded-3xl",
  "apple\\:bg-surface",
  "apple\\:font-sans",
  "apple\\:text-4xl",
  "apple\\:text-6xl",
  "apple\\:border-0",
  "apple\\:hidden",
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

const missing = REQUIRED.filter((needle) => !css.includes(needle));

console.log(
  `Compiled CSS: ${CSS_DIR} (${fileCount} file(s), ${(css.length / 1024).toFixed(0)} kB)`,
);
for (const needle of REQUIRED) {
  const found = css.includes(needle);
  console.log(`  ${found ? "PASS" : "FAIL"}  ${needle.replace(/\\/g, "")}`);
}

// The token block is what actually recolours the app; without it the utility
// classes exist but every colour stays the datasheet palette. Tailwind rewrites
// quotes in selectors, so match the unquoted form too.
const tokensPresent =
  css.includes('[data-theme=apple]') &&
  /--color-signal:\s*#0058b8/i.test(css);
console.log(
  `  ${tokensPresent ? "PASS" : "FAIL"}  [data-theme="apple"] token block`,
);

if (missing.length > 0 || !tokensPresent) {
  console.error(
    "\nThe apple theme did not compile. Every rule above must be present.",
  );
  process.exit(1);
}
console.log("\nThe apple variant compiled and the token block is present.");