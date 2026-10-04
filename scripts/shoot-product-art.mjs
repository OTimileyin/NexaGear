/**
 * Screenshots the product artwork in both colour schemes.
 *
 * The desktop preview webview has been refusing to composite, so this drives
 * Chromium through Playwright instead. It also checks the thing a screenshot
 * cannot: that the mask pixel luminance actually flips between schemes, which
 * is the property that makes the artwork theme-aware rather than a hardcoded
 * light-mode image wearing a dark background.
 *
 *   node scripts/shoot-product-art.mjs
 */

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:64820";
const OUT = "test-results/art";

const PAGES = [
  ["/product/compact-mechanical-keyboard", "keyboard"],
  ["/shop", "shop"],
];

/**
 * Every product in the catalogue, so a flat or broken file is caught rather
 * than only whichever one happens to render first on /shop.
 */
const PRODUCTS = [
  "adjustable-laptop-stand",
  "arduino-starter-kit",
  "compact-mechanical-keyboard",
  "developer-precision-mouse",
  "gan-fast-charger",
  "portable-power-bank",
  "robot-chassis-motor-bundle",
  "sensor-exploration-pack",
  "soldering-prototyping-kit",
  "studio-monitoring-headphones",
  "usb-c-8-in-1-hub",
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
let failures = 0;

/**
 * Luminance distribution of a rendered element, measured from real pixels.
 *
 * Chromium takes the screenshot, hands it back into the page as a data URL, and
 * it is read through a canvas — no image decoder needed.
 *
 * The important detail is WHAT is measured. The artwork is letterboxed inside a
 * mostly-transparent box, so a plain average is dominated by whatever is behind
 * it and says nothing about visibility. What matters is whether pixels in the
 * artwork's own colour are actually present, so the minimum and maximum are
 * reported instead: visible ink widens the range.
 */
async function measureLuminance(page, selector) {
  const locator = page.locator(selector).first();
  // locator.screenshot() scrolls into view and uses the right coordinate space;
  // boundingBox() + clip does not, which silently sampled the wrong region.
  const buffer = await locator.screenshot();
  const dataUrl = `data:image/png;base64,${buffer.toString("base64")}`;
  return page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let min = 255;
    let max = 0;
    let count = 0;
    // Buckets of luminance, used to tell a shaded rendering from a flat
    // silhouette. A blob of one colour lands in a single bucket; anything with
    // depth spreads across several.
    const buckets = new Set();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 8) continue;
      const lum =
        0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      if (lum < min) min = lum;
      if (lum > max) max = lum;
      buckets.add(Math.floor(lum / 16));
      count += 1;
    }
    return count === 0
      ? null
      : {
          min: Math.round(min),
          max: Math.round(max),
          buckets: buckets.size,
          coverage: Math.round((100 * count) / (canvas.width * canvas.height)),
        };
  }, dataUrl);
}

for (const [route, name] of PAGES) {
  const perScheme = {};
  for (const scheme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(`${BASE}${route}?scheme=${scheme}`, { waitUntil: "load" });

    const file = `${OUT}/${name}-${scheme}.png`;
    await page.screenshot({ path: file, fullPage: false });

    const stats = await page.evaluate(() => {
      const art = document.querySelector(".product-art");
      if (!art) return null;
      const cs = getComputedStyle(art);
      const r = art.getBoundingClientRect();
      return {
        bg: cs.backgroundColor,
        hasMask: Boolean(cs.maskImage || cs.webkitMaskImage),
        w: Math.round(r.width),
        h: Math.round(r.height),
        pageBg: getComputedStyle(document.body).backgroundColor,
      };
    });

    const lum = await measureLuminance(page, ".product-art");
    perScheme[scheme] = lum;

    console.log(`${route} [${scheme}]`);
    console.log(`  mask applied : ${stats?.hasMask ? "yes" : "NO — artwork invisible"}`);
    console.log(`  mask colour  : ${stats?.bg}   page: ${stats?.pageBg}`);
    console.log(
      `  painted range: ${lum ? `${lum.min}..${lum.max}` : "no opaque pixels — blank"}` +
        `   shading buckets: ${lum?.buckets ?? 0}   coverage: ${lum?.coverage ?? 0}%`,
    );
    console.log(`  -> ${file}`);

    if (lum && lum.buckets < 4) {
      console.error(
        `  FAIL: only ${lum.buckets} luminance bucket(s) — that is a flat silhouette, not a shaded rendering`,
      );
      failures += 1;
    }

    if (!stats?.hasMask) {
      console.error("  FAIL: the CSS mask did not apply");
      failures += 1;
    }
    if (lum === null) {
      console.error("  FAIL: nothing was painted");
      failures += 1;
    } else if (lum.max - lum.min < 60) {
      // Too flat to be artwork: the ink and its background are nearly the same,
      // so the product is effectively invisible.
      console.error(
        `  FAIL: painted range ${lum.min}..${lum.max} is too flat — artwork is not legible`,
      );
      failures += 1;
    }
    await page.close();
  }

  /**
   * The point of the mask: the artwork must be legible on BOTH surfaces. In the
   * light scheme the ink is dark, so the artwork drives the range DOWN; in the
   * dark scheme the ink is light, so it drives it UP. If the dark render has a
   * darker minimum than the light one, the artwork is still carrying its own
   * colours.
   */
  const { light, dark } = perScheme;
  if (light && dark) {
    const lightInk = light.min < 90;
    const darkInk = dark.max > 170;
    if (lightInk && darkInk) {
      console.log(
        `  theme-aware  : yes (dark ink in light, light ink in dark)`,
      );
    } else {
      console.error(
        `  FAIL: expected dark ink on light (min<90) and light ink on dark ` +
          `(max>170); got min=${light.min} and max=${dark.max}`,
      );
      failures += 1;
    }
  }
}

await browser.close();

if (failures > 0) {
  console.error(`\n${failures} artwork check(s) failed.`);
  process.exit(1);
}
console.log("\nArtwork renders through the mask and inverts with the scheme.");

/**
 * Per-product check across the whole catalogue.
 *
 * /shop only proves the first card. Each product gets its own page so a file
 * that is malformed, flat, or renders as an empty box is caught by name rather
 * than hiding behind whichever product happened to load first.
 */
await (async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  let flat = 0;
  console.log("\nper-product shading check");
  console.log("-------------------------");
  for (const slug of PRODUCTS) {
    await page.goto(`${BASE}/product/${slug}?scheme=light`, {
      waitUntil: "load",
    });
    const lum = await measureLuminance(page, ".product-art");
    const ok = lum && lum.buckets >= 4 && lum.max - lum.min >= 60;
    if (!ok) flat += 1;
    console.log(
      `  ${ok ? "PASS" : "FAIL"}  ${slug.padEnd(28)} ` +
        `range ${lum ? `${lum.min}..${lum.max}` : "blank"}  buckets ${lum?.buckets ?? 0}`,
    );
  }
  await browser.close();
  if (flat > 0) {
    console.error(`\n${flat} product image(s) are flat or blank.`);
    process.exit(1);
  }
  console.log(`\nAll ${PRODUCTS.length} product images are shaded and visible.`);
})();
