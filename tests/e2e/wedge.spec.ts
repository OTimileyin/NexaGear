import { expect, test } from "@playwright/test";

/**
 * Critical-journey e2e (TESTING.md §3).
 *
 * BLOCKED without a configured Supabase project + seed data:
 *   1. `cp .env.example .env.local` and fill in real values
 *   2. apply supabase/migrations/0001 + 0002
 *   3. `npx playwright install` (browsers)
 *   4. `npm run test:e2e`
 *
 * Live Google OAuth is verified manually (TESTING.md §4) — OAuth providers
 * cannot be automated reliably without third-party credentials.
 */

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

test("wedge: browse → product → cart → checkout auth gate", async ({ page }) => {
  // Catalogue renders from the database
  await page.goto("/shop");
  await expect(page.getByRole("heading", { name: "Shop" })).toBeVisible();
  const firstProduct = page.locator("article a").first();
  await expect(firstProduct).toBeVisible();
  await firstProduct.click();
  await page.waitForURL("**/product/*");

  // Product detail with spec sheet
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(
    page.getByText("Added to cart.", { exact: false }),
  ).toBeVisible();

  // Cart shows the line and a subtotal
  await page.getByRole("link", { name: "Cart", exact: true }).click();
  await page.waitForURL("**/cart");
  await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
  await expect(page.getByText("Subtotal")).toBeVisible();

  // Checkout gate for signed-out visitor (PRD §18)
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.waitForURL("**/checkout");
  await expect(
    page.getByRole("heading", { name: "Sign in to place your order" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
});

test("404 page routes back to the shop", async ({ page }) => {
  await page.goto("/product/definitely-not-a-product");
  await expect(
    page.getByRole("heading", { name: "This page isn't in the catalogue" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Browse the catalogue" }).click();
  await page.waitForURL("**/shop");
});
