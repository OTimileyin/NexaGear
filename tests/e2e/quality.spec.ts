import { expect, test, type ConsoleMessage, type Page } from "@playwright/test";

/**
 * Production-quality checks that only a real browser can answer.
 *
 * These back the claims in docs/PRODUCTION_QUALITY.md. Every assertion here
 * exists because a static check cannot make it: a clean TypeScript build says
 * nothing about whether the console is silent, and axe says nothing about
 * whether a link points at a route that exists.
 *
 * Route set is the public surface. /admin is excluded deliberately: it is only
 * reachable with a signed-in admin session, so it is recorded as UNVERIFIED in
 * the docs rather than quietly skipped.
 */

const ROUTES = ["/", "/shop", "/cart", "/checkout", "/order/track", "/privacy", "/terms"];

/** Messages we do not cause and cannot fix. Kept explicit and minimal. */
const IGNORED_CONSOLE = [
  // Clerk's dev instance logs its own notices to the console.
  /clerk/i,
  /DevTools/i,
  /Download the React DevTools/i,
];

function collectProblems(page: Page) {
  const problems: string[] = [];

  page.on("console", (message: ConsoleMessage) => {
    const type = message.type();
    if (type !== "error" && type !== "warning") return;
    const text = message.text();
    if (IGNORED_CONSOLE.some((pattern) => pattern.test(text))) return;
    problems.push(`console.${type}: ${text}`);
  });

  page.on("pageerror", (error) => {
    problems.push(`pageerror: ${error.message}`);
  });

  page.on("requestfailed", (request) => {
    // Aborted requests are normal when a navigation supersedes an in-flight
    // fetch, so only failures with no response count.
    const failure = request.failure()?.errorText ?? "";
    if (/aborted|NS_BINDING_ABORTED/i.test(failure)) return;
    problems.push(`requestfailed: ${request.url()} (${failure})`);
  });

  return problems;
}

test.describe("production quality", () => {
  for (const route of ROUTES) {
    test(`console is clean on ${route}`, async ({ page }) => {
      const problems = collectProblems(page);

      const response = await page.goto(route, { waitUntil: "load" });
      expect(response?.status(), `${route} should respond 2xx`).toBeLessThan(400);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      // Give late effects a chance to throw before we judge the console.
      await page.waitForTimeout(1200);

      expect(problems, `problems on ${route}:\n${problems.join("\n")}`).toEqual([]);
    });
  }

  test("every internal link resolves", async ({ page, request }) => {
    // Crawling every discovered route serially in dev mode means each one
    // compiles on first hit, which comfortably exceeds the default timeout.
    test.setTimeout(240_000);

    const hrefs = new Set<string>();

    for (const route of ROUTES) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      const found = await page.evaluate(() =>
        Array.from(document.querySelectorAll("a[href]"))
          .map((anchor) => anchor.getAttribute("href") ?? "")
          .filter((href) => href.startsWith("/") || href.startsWith("#") === false),
      );
      for (const href of found) {
        // Ignore pure fragments; they are not routes.
        if (!href.startsWith("/")) continue;
        hrefs.add(href.split("#")[0]);
      }
    }

    expect(hrefs.size, "expected to discover internal links").toBeGreaterThan(5);

    const broken: string[] = [];
    for (const href of [...hrefs].sort()) {
      const response = await request.get(href, { maxRedirects: 5 });
      if (response.status() >= 400) broken.push(`${href} -> ${response.status()}`);
    }

    expect(broken, `broken internal links:\n${broken.join("\n")}`).toEqual([]);
  });

  test("every product image has a descriptive accessible name", async ({
    page,
  }) => {
    await page.goto("/shop");

    // The artwork is NOT an <img>: it is a span with role="img" whose SVG is
    // applied as a CSS mask, so one file can follow the theme (D33). The
    // accessible name therefore comes from aria-label.
    const images = page.locator('article [role="img"]');
    const count = await images.count();
    expect(count, "expected named product images on /shop").toBeGreaterThan(0);

    const problems: string[] = [];
    for (let index = 0; index < count; index += 1) {
      const image = images.nth(index);
      const name = ((await image.getAttribute("aria-label")) ?? "").trim();

      if (name.length < 4) {
        problems.push(`image ${index}: name too short (${JSON.stringify(name)})`);
      }
      if (/^(image|product image|photo|artwork)$/i.test(name)) {
        problems.push(`image ${index}: name is generic (${JSON.stringify(name)})`);
      }
      // The mask has to have actually applied, or the tile renders empty.
      const masked = await image.evaluate((element) => {
        const style = getComputedStyle(element);
        return Boolean(
          style.maskImage && style.maskImage !== "none" && style.maskImage !== "",
        );
      });
      if (!masked) problems.push(`image ${index}: mask-image did not apply`);
    }

    expect(problems, `image problems:\n${problems.join("\n")}`).toEqual([]);
  });

  test("social cards exist, are real PNGs, and contain the brand's ink", async ({
    page,
  }) => {
    test.setTimeout(180_000);

    const routes = [
      { route: "/", expectProductCard: false },
      { route: "/shop", expectProductCard: false },
      { route: "/product/compact-mechanical-keyboard", expectProductCard: true },
    ];

    for (const { route, expectProductCard } of routes) {
      await page.goto(route, { waitUntil: "load" });

      const meta = await page.evaluate(() => {
        const content = (selector: string) =>
          document.querySelector(selector)?.getAttribute("content") ?? null;
        return {
          image: content('meta[property="og:image"]'),
          imageAlt: content('meta[property="og:image:alt"]'),
          card: content('meta[name="twitter:card"]'),
          twitterImage: content('meta[name="twitter:image"]'),
          url: content('meta[property="og:url"]'),
          canonical:
            document
              .querySelector('link[rel="canonical"]')
              ?.getAttribute("href") ?? null,
        };
      });

      // A share link with no image is the defect this test exists for.
      expect(meta.image, `${route} must publish og:image`).toBeTruthy();
      expect(meta.imageAlt, `${route} must describe its card`).toBeTruthy();
      expect(meta.card, `${route} card type`).toBe("summary_large_image");
      expect(meta.twitterImage, `${route} twitter image`).toBe(meta.image);

      // og:url and the canonical describe the same page, or one of them lies.
      expect(meta.canonical, `${route} must publish a canonical`).toBeTruthy();
      expect(meta.url).toBe(meta.canonical);

      if (expectProductCard) {
        expect(
          meta.image,
          "a product share must use its own card, not the site one",
        ).toContain("/opengraph-image");
        expect(meta.image).toContain("/product/");
      }

      // Decode the card in the browser: a 200 response and a .png URL do not
      // prove the image rendered anything. A blank card is a valid PNG.
      const card = await page.evaluate(async (url: string) => {
        const response = await fetch(url);
        const bytes = await response.arrayBuffer();
        const bitmap = await createImageBitmap(new Blob([bytes]));

        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const context = canvas.getContext("2d");
        if (!context) return null;
        context.drawImage(bitmap, 0, 0);
        const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);

        const seen = new Set<string>();
        let nonBackground = 0;
        const total = bitmap.width * bitmap.height;
        for (let index = 0; index < data.length; index += 4) {
          const key = `${data[index]},${data[index + 1]},${data[index + 2]}`;
          seen.add(key);
          // Paper is #F6F3EC; anything far from it is drawn content.
          if (
            Math.abs(data[index] - 246) +
              Math.abs(data[index + 1] - 243) +
              Math.abs(data[index + 2] - 236) >
            40
          ) {
            nonBackground += 1;
          }
        }

        return {
          status: response.status,
          type: response.headers.get("content-type"),
          width: bitmap.width,
          height: bitmap.height,
          distinctColours: seen.size,
          inkRatio: nonBackground / total,
          hasPaper: seen.has("246,243,236"),
          hasInk: seen.has("26,29,33"),
          hasSignal: seen.has("196,67,15"),
        };
      }, meta.image as string);

      expect(card, `${route}: card did not decode`).not.toBeNull();
      expect(card?.status).toBe(200);
      expect(card?.type).toBe("image/png");
      expect(card?.width).toBe(1200);
      expect(card?.height).toBe(630);

      // The card must be the site's palette, not a blank sheet: paper ground,
      // ink text, and the signal accent.
      expect(card?.hasPaper, `${route}: card is missing the paper ground`).toBe(
        true,
      );
      expect(card?.hasInk, `${route}: card is missing ink text`).toBe(true);
      expect(card?.hasSignal, `${route}: card is missing the accent rule`).toBe(
        true,
      );
      // Text and rules should cover a real share of the canvas.
      expect(card?.inkRatio ?? 0).toBeGreaterThan(0.02);
      expect(card?.distinctColours ?? 0).toBeGreaterThan(3);
    }
  });

  test("images reserve their space, so nothing shifts after load", async ({
    page,
  }) => {
    await page.goto("/shop");

    // Cumulative Layout Shift, measured rather than assumed. "Good" is < 0.1
    // per the Core Web Vitals threshold.
    const cls = await page.evaluate(async () => {
      const entries: number[] = [];
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & {
            value: number;
            hadRecentInput: boolean;
          };
          if (!shift.hadRecentInput) entries.push(shift.value);
        }
      });
      observer.observe({ type: "layout-shift", buffered: true });

      // Let anything still in flight settle.
      await new Promise((resolve) => setTimeout(resolve, 2500));
      observer.disconnect();
      return entries.reduce((total, value) => total + value, 0);
    });

    expect(cls, `CLS was ${cls.toFixed(4)}`).toBeLessThan(0.1);
  });
});
