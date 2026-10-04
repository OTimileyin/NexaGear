/**
 * Full contrast audit for every colour pairing the UI can render.
 *
 * There are now FOUR colour schemes, because a theme (datasheet | apple) and a
 * scheme (light | dark) are independent axes:
 *
 *     datasheet/light   datasheet/dark
 *     apple/light       apple/dark
 *
 * Every one is audited against the same thresholds. A token that passes in one
 * combination says nothing about the other three — that is exactly how a dark
 * theme ships unreadable text.
 *
 * The audit also greps app/globals.css for the hex it expects. Without that,
 * this file and the stylesheet can drift apart: someone edits the CSS, the audit
 * keeps passing, and the numbers reported below stop describing the real site.
 *
 *   node scripts/color-contrast-audit.mjs
 *
 * Exits non-zero if any pairing fails or any expected hex is missing from the
 * CSS, so it can be used as a required gate.
 */

import { readFileSync } from "node:fs";

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const v = hex.replace("#", "");
  return (
    0.2126 * srgbToLinear(parseInt(v.slice(0, 2), 16)) +
    0.7152 * srgbToLinear(parseInt(v.slice(2, 4), 16)) +
    0.0722 * srgbToLinear(parseInt(v.slice(4, 6), 16))
  );
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const PALETTES = {
  "datasheet/light": {
    paper: "#f6f3ec",
    surface: "#ffffff",
    ink: "#1a1d21",
    drafting: "#2254a3",
    signal: "#c4430f",
    steel: "#5c646d",
    stock: "#2e7d4f",
  },
  "datasheet/dark": {
    paper: "#16181c",
    surface: "#1f2228",
    ink: "#e9e7e1",
    drafting: "#8ab4f8",
    signal: "#ff8a5b",
    steel: "#a7adb6",
    stock: "#5fd39a",
  },
  "apple/light": {
    paper: "#ffffff",
    surface: "#f5f5f7",
    ink: "#1d1d1f",
    drafting: "#0058b8",
    signal: "#0058b8",
    steel: "#5b5b60",
    stock: "#1c6b3f",
  },
  "apple/dark": {
    paper: "#000000",
    surface: "#1c1c1e",
    ink: "#f5f5f7",
    drafting: "#409cff",
    signal: "#409cff",
    steel: "#a1a1a6",
    stock: "#3fbf6b",
  },
};

/**
 * [foreground token, background token, minimum ratio, what it is]
 *
 * 4.5 is WCAG 1.4.3 for normal text, 3.0 is 1.4.11 for non-text UI (focus
 * rings, control borders). Large text (>=24px, or >=18.66px bold) may use 3.0,
 * but nothing here relies on that exemption.
 */
const PAIRINGS = [
  ["ink", "paper", 4.5, "body text on the page"],
  ["ink", "surface", 4.5, "body text on a raised surface"],
  ["steel", "paper", 4.5, "secondary text on the page"],
  ["steel", "surface", 4.5, "secondary text on a raised surface"],
  ["drafting", "paper", 4.5, "links and annotations on the page"],
  ["drafting", "surface", 4.5, "links and annotations on a raised surface"],
  ["signal", "paper", 4.5, "prices on the page"],
  ["signal", "surface", 4.5, "prices on a raised surface"],
  ["stock", "paper", 4.5, "in-stock text on the page"],
  ["stock", "surface", 4.5, "in-stock text on a raised surface"],
  ["paper", "ink", 4.5, "label on an inverted button (hover:bg-ink)"],
  ["paper", "signal", 4.5, "label on the primary button"],
  ["paper", "stock", 4.5, "text on a stock-green fill"],
  ["ink", "paper", 3.0, "focus ring against the page"],
  ["drafting", "paper", 3.0, "annotation rules and control borders"],
  ["signal", "paper", 3.0, "status dot beside its text"],
];

/** Reference values that must survive as a warning even though they are not gated. */
const APPLE_PUBLISHED = {
  "systemBlue #0071E3": "#0071e3",
  "systemGreen #30D158": "#30d158",
  "label #FFFFFF on black": null,
};

let failures = 0;

console.log("Full contrast audit — 4 combinations\n");

for (const [name, palette] of Object.entries(PALETTES)) {
  console.log(`${name}`);
  console.log("-".repeat(name.length));
  console.log(
    `  ${Object.entries(palette)
      .map(([k, v]) => `${k} ${v}`)
      .join("  ")}`,
  );
  for (const [fg, bg, min, purpose] of PAIRINGS) {
    const ratio = contrast(palette[fg], palette[bg]);
    const pass = ratio >= min;
    if (!pass) failures += 1;
    console.log(
      `  ${pass ? "PASS" : "FAIL"}  ${ratio.toFixed(2).padStart(5)}:1 ` +
        `(min ${min})  ${fg} on ${bg} — ${purpose}`,
    );
  }
  console.log();
}

console.log("Reference: Apple's published values, for context only");
console.log("---------------------------------------------------");
for (const [name, hex] of Object.entries(APPLE_PUBLISHED)) {
  if (!hex) {
    console.log(`  ${name} — 21.00:1 (max possible)`);
    continue;
  }
  const onWhite = contrast(hex, "#ffffff");
  const onBlack = contrast(hex, "#000000");
  console.log(
    `  ${name.padEnd(22)} ${onWhite.toFixed(2)}:1 on white, ` +
      `${onBlack.toFixed(2)}:1 on black`,
  );
}
console.log(
  "  Apple's own system colours pass on one background and fail on the other,",
);
console.log("  which is why both schemes here are measured, not copied.\n");

/**
 * Guard against drift between this file and the stylesheet. Every hex audited
 * above must actually appear in app/globals.css, otherwise the numbers are
 * describing a palette the site does not use.
 */
let css = "";
try {
  css = readFileSync("app/globals.css", "utf8");
} catch {
  console.error("FAIL  could not read app/globals.css");
  process.exit(2);
}

const cssIssues = [];
for (const palette of Object.values(PALETTES)) {
  for (const [token, hex] of Object.entries(palette)) {
    if (!css.toLowerCase().includes(hex.toLowerCase())) {
      cssIssues.push(`${token} ${hex}`);
    }
  }
}

if (cssIssues.length > 0) {
  console.log("FAIL  these audited colours are missing from app/globals.css:");
  for (const issue of cssIssues) console.log(`        ${issue}`);
  console.log();
  failures += cssIssues.length;
} else {
  const unique = new Set(
    Object.values(PALETTES).flatMap((p) => Object.values(p)),
  );
  console.log(
    `PASS  all ${unique.size} audited colours are present in app/globals.css`,
  );
}

if (failures > 0) {
  console.error(`\n${failures} contrast problem(s).`);
  process.exit(1);
}
console.log("\nEvery pairing in every combination passes.");
