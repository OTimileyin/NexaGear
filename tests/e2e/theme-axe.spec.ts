import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Accessibility scan for every theme AND scheme combination.
 *
 * Theme (datasheet | apple) and scheme (light | dark) are independent axes, so
 * there are four appearances. The dark schemes are the risky ones: they swap
 * every colour token, so an accent that cleared AA on white could quietly fail
 * on near-black — the datasheet signal orange measures about 3.3:1 there.
 * Scanning only the default appearance would leave three unverified, which is
 * exactly the state this project has been correcting all along.
 *
 * `datasheet/light` is the shipped default, so it is asserted first and its
 * failures are genuine regressions. The other three meet the same bar.
 */

// Resolved by path rather than import.meta, because Playwright transpiles this
// spec to CommonJS and import.meta is unavailable there.
const axeSource = readFileSync(
  join(process.cwd(), "node_modules", "axe-core", "axe.min.js"),
  "utf8",
);

const ROUTES = ["/", "/shop", "/cart", "/privacy", "/terms"];
const THEMES = ["datasheet", "apple"] as const;
const SCHEMES = ["light", "dark"] as const;

const configured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

test.describe.configure({ mode: "serial" });

test.beforeEach(() => {
  test.skip(
    !configured,
    "BLOCKED: needs Supabase env (.env.local) and applied migrations",
  );
});

// 20 route scans with axe injected each time is far heavier than the journey
// test, and this machine is slow. Without this the default 30s timeout kills a
// run that would otherwise pass.
test.setTimeout(360_000);

test("all four theme-and-scheme combinations pass axe at WCAG 2.2 AA", async ({
  page,
}) => {
  const failures: string[] = [];

  for (const theme of THEMES) {
    for (const scheme of SCHEMES) {
      for (const route of ROUTES) {
      // "load" rather than "networkidle": Clerk keeps connections open, so
      // networkidle never settles and would time out on every route.
      await page.goto(`${route}?theme=${theme}&scheme=${scheme}`, {
        waitUntil: "load",
      });

      // Confirm the appearance actually applied. A scan of the wrong scheme
      // would pass while proving nothing — and the failure mode is silent,
      // because a light-themed scan of a dark page is still "accessible".
      const applied = await page.evaluate(() => ({
        theme: document.documentElement.getAttribute("data-theme"),
        scheme: document.documentElement.getAttribute("data-scheme"),
      }));
      expect(
        applied.theme,
        `theme did not apply on ${route}`,
      ).toBe(theme);
      expect(
        applied.scheme,
        `scheme did not apply on ${route}`,
      ).toBe(scheme);

      await page.evaluate(axeSource);
      // axe's own types are not imported: the library is injected as a string,
      // so the result is typed here rather than relying on a global that
      // TypeScript cannot see.
      interface AxeNode {
        html: string;
      }
      interface AxeViolation {
        id: string;
        impact: string | null;
        help: string;
        nodes: AxeNode[];
      }

      const result = await page.evaluate(async () => {
        // @ts-expect-error -- axe is injected above, not imported.
        return await window.axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
          },
        });
      }) as { violations: AxeViolation[] };

        for (const violation of result.violations) {
          failures.push(
            `[${theme}/${scheme}] ${route} — ${violation.id} ` +
              `(${violation.impact}): ${violation.help} | ` +
              violation.nodes
                .slice(0, 3)
                .map((n: { html: string }) => n.html.slice(0, 120))
                .join(" || "),
          );
        }
      }
    }
  }

  expect(failures, failures.join("\n")).toEqual([]);
});