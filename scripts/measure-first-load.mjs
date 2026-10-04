/**
 * Measures the first-load JavaScript a real browser pulls for a route, from a
 * PRODUCTION server, and flags anything over the documented budget.
 *
 * This exists because `next build` in Next 16 no longer prints the per-route
 * "First Load JS" table, so the budget in docs/PRODUCTION_QUALITY.md would
 * otherwise be a number nobody had ever measured. Transfer size is what the
 * budget is about, so it is read from the browser's own resource timings
 * (encoded bytes, i.e. after brotli/gzip) rather than from file sizes on disk.
 *
 * Usage:
 *   npm run build
 *   npx next start -p 64821 &
 *   node scripts/measure-first-load.mjs
 */

import { chromium } from "@playwright/test";

const BASE = process.env.MEASURE_BASE_URL ?? "http://localhost:64821";
const BUDGET_BYTES = 200 * 1024;

const ROUTES = ["/", "/shop", "/cart", "/checkout"];

const browser = await chromium.launch();

let failed = false;

for (const route of ROUTES) {
  // A fresh context per route so nothing is served from cache.
  const context = await browser.newContext();
  const fresh = await context.newPage();

  await fresh.goto(`${BASE}${route}`, { waitUntil: "load" });
  await fresh.waitForTimeout(1500);

  // Plain JS on purpose: this file is .mjs, so a TypeScript cast would be a
  // syntax error rather than a type annotation.
  const scripts = await fresh.evaluate(() =>
    performance
      .getEntriesByType("resource")
      .filter((entry) => entry.initiatorType === "script")
      .map((entry) => ({
        name: entry.name.split("/").pop() ?? entry.name,
        transfer: entry.transferSize,
        decoded: entry.decodedBodySize,
      })),
  );

  const total = scripts.reduce((sum, script) => sum + script.transfer, 0);
  const decoded = scripts.reduce((sum, script) => sum + script.decoded, 0);
  const overBudget = total > BUDGET_BYTES;

  if (overBudget) failed = true;

  console.log(
    `${route.padEnd(11)} ${String(scripts.length).padStart(3)} scripts  ` +
      `${(total / 1024).toFixed(1).padStart(7)} KB transferred  ` +
      `(${(decoded / 1024).toFixed(1)} KB decoded)` +
      (overBudget ? "  OVER BUDGET" : ""),
  );

  // MEASURE_DETAIL=1 answers "what is actually heavy" — without it a budget
  // overrun is just a number.
  if (process.env.MEASURE_DETAIL === "1") {
    for (const script of scripts.sort((a, b) => b.transfer - a.transfer)) {
      console.log(
        `              ${(script.transfer / 1024).toFixed(1).padStart(7)} KB  ${script.name}`,
      );
    }
  }

  await context.close();
}

await browser.close();

console.log(
  `\nbudget: ${(BUDGET_BYTES / 1024).toFixed(0)} KB gzipped first-load JS per route`,
);

if (failed) {
  console.error("FAIL: at least one route exceeded the first-load JS budget");
  process.exit(1);
}

console.log("All routes are within budget.");
