/**
 * Profiles the production site the way a phone would experience it.
 *
 * Every number here answers a specific item on the performance checklist, so
 * the answers are measurements rather than opinions:
 *
 *   - long tasks / main-thread blocking  → "ensure taps and scrolling are not blocked"
 *   - DOM size and rendered card count   → "virtualize long lists", "paginate result sets"
 *   - <img> vs mask-based artwork bytes  → "compress oversized images", "reuse cached images"
 *   - script transfer per route          → "defer startup work", "profile the production build"
 *
 * It measures the PRODUCTION build, not the dev server, because dev numbers are
 * meaningless (dev bundles are unminified and Turbopack adds its own overhead).
 *
 * Usage:
 *   npm run build
 *   npx next start -p 64821 &
 *   node scripts/profile-web.mjs
 */

import { chromium } from "@playwright/test";

const BASE = process.env.MEASURE_BASE_URL ?? "http://localhost:64821";
const ROUTES = ["/", "/shop", "/product/compact-mechanical-keyboard", "/cart"];

const browser = await chromium.launch();

/**
 * Long tasks are collected from an init script, because the ones that matter
 * happen DURING load — an observer installed after `goto` has already missed
 * the parse and hydrate work it is supposed to measure.
 *
 * The entry type is `"longtask"`, with no hyphen. Getting that wrong returns an
 * empty array forever, which reads exactly like "the main thread is never
 * blocked" — a check that cannot fail is worse than no check, so the first
 * version of this file reported 0ms on every route and was simply wrong. Run
 * with PROFILE_CONTROL=1 to inject a known 150ms block and confirm the harness
 * can still see one.
 */
const COLLECT = () => {
  window.__longTasks = [];
  window.__supported = false;
  try {
    window.__supported = PerformanceObserver.supportedEntryTypes.includes("longtask");
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__longTasks.push(entry.duration);
    }).observe({ type: "longtask", buffered: true });
  } catch {
    window.__supported = false;
  }
};

for (const route of ROUTES) {
  // A fresh context per route: a warm cache would hide the startup cost, which
  // is the whole point of measuring it.
  const context = await browser.newContext();
  // Every context is fresh, so every context needs its own init script.
  await context.addInitScript(COLLECT);

  const page = await context.newPage();

  await page.goto(`${BASE}${route}`, { waitUntil: "load" });

  if (process.env.PROFILE_CONTROL === "1") {
    // A deliberate main-thread block, injected on EVERY route. If any route
    // reports 0ms with the control on, that route's measurement is broken and
    // its clean number means nothing.
    await page.evaluate(() => {
      const start = performance.now();
      while (performance.now() - start < 150) {
        /* hold the thread */
      }
    });
  }

  await page.waitForTimeout(2000);

  const metrics = await page.evaluate(() => {
    const longTasks = window.__longTasks.map((duration) => ({ duration }));
    const resources = performance.getEntriesByType("resource");
    const scripts = resources.filter((entry) => entry.initiatorType === "script");
    const images = resources.filter(
      (entry) =>
        entry.initiatorType === "img" ||
        entry.initiatorType === "css" ||
        /\.(svg|png|jpe?g|webp|avif)$/i.test(entry.name),
    );

    const bytes = (entries) =>
      entries.reduce((total, entry) => total + entry.transferSize, 0);

    return {
      supportsLongTaskApi: window.__supported,
      longTaskCount: longTasks.length,
      longTaskTotalMs: longTasks.reduce(
        (total, entry) => total + entry.duration,
        0,
      ),
      // Longest single block: the number that decides whether a tap feels late.
      longestTaskMs: longTasks.reduce(
        (worst, entry) => Math.max(worst, entry.duration),
        0,
      ),
      domNodes: document.querySelectorAll("*").length,
      cards: document.querySelectorAll("article").length,
      rasterImages: document.querySelectorAll('img[src$=".png"], img[src$=".jpg"]')
        .length,
      maskedArtwork: document.querySelectorAll(".product-art").length,
      scriptCount: scripts.length,
      scriptBytes: bytes(scripts),
      imageBytes: bytes(images),
      // Layout shift accumulated after load, i.e. movement the user did not cause.
      cls: performance
        .getEntriesByType("layout-shift")
        .filter((entry) => !entry.hadRecentInput)
        .reduce((total, entry) => total + entry.value, 0),
    };
  });

  const kb = (value) => `${(value / 1024).toFixed(1)} KB`;

  console.log(`\n${route}`);
  console.log(
    `  main thread   longest block ${metrics.longestTaskMs.toFixed(0)}ms` +
      `  ·  ${metrics.longTaskCount} long task(s) totalling ${metrics.longTaskTotalMs.toFixed(0)}ms` +
      (metrics.supportsLongTaskApi ? "" : "  [unsupported: measurement invalid]"),
  );
  console.log(
    `  DOM           ${metrics.domNodes} nodes  ·  ${metrics.cards} rendered card(s)` +
      `  ·  ${metrics.maskedArtwork} mask artwork  ·  ${metrics.rasterImages} raster image(s)`,
  );
  console.log(
    `  transferred   ${metrics.scriptCount} script(s) ${kb(metrics.scriptBytes)}` +
      `  ·  images/fonts ${kb(metrics.imageBytes)}`,
  );
  console.log(`  layout shift  CLS ${metrics.cls.toFixed(4)}`);

  await context.close();
}

await browser.close();
