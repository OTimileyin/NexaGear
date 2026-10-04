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

  // The cart opens as a slide-over sheet, not a navigation. This assertion
  // changed with the feature: the header control is now a button that reveals a
  // dialog, so waiting for /cart here would hang. /cart still exists as a real
  // page for deep links, and is checked separately below.
  const cartButton = page.getByRole("button", { name: "Cart", exact: true });
  await expect(cartButton).toHaveAttribute("aria-expanded", "false");
  await cartButton.click();

  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  await expect(page.getByText("Subtotal")).toBeVisible();
  await expect(cartButton).toHaveAttribute("aria-expanded", "true");

  // Escape closes it and focus returns to the control that opened it.
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(cartButton).toBeFocused();

  // Checkout gate for signed-out visitor (PRD §18)
  await cartButton.click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Continue to checkout" })
    .click();
  await page.waitForURL("**/checkout");
  await expect(
    page.getByRole("heading", { name: "Sign in to place your order" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
});

test("the cart sheet is reachable by keyboard alone", async ({ page }) => {
  await page.goto("/shop");

  const cartButton = page.getByRole("button", { name: "Cart", exact: true });
  await cartButton.focus();
  await page.keyboard.press("Enter");

  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();

  // A modal dialog must keep Tab inside itself, otherwise a keyboard user
  // tabs into the page hidden behind the sheet.
  const insideDialog = await page.evaluate(() => {
    const dialog = document.querySelector("dialog");
    return dialog?.contains(document.activeElement) ?? false;
  });
  expect(insideDialog, "focus should move into the dialog on open").toBe(true);

  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();
  await expect(cartButton).toBeFocused();
});

test("/cart still works as a deep link", async ({ page }) => {
  // A sheet cannot be linked to, so the standalone page must survive for
  // shared and bookmarked URLs.
  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: "Cart" })).toBeVisible();
  await expect(page.getByText("Your cart is empty")).toBeVisible();
});

test("404 page routes back to the shop", async ({ page }) => {
  await page.goto("/product/definitely-not-a-product");
  await expect(
    page.getByRole("heading", { name: "This page isn't in the catalogue" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Browse the catalogue" }).click();
  await page.waitForURL("**/shop");
});
