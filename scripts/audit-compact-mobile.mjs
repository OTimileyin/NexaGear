import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const folder = "test-results/compact-mobile";
await mkdir(folder, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [360, 390, 430, 768]) {
    const context = await browser.newContext({ viewport: { width, height: 873 }, colorScheme: "light", reducedMotion: "reduce" });
    const page = await context.newPage(); page.setDefaultTimeout(120000);
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    await page.goto("http://localhost:8081", { timeout: 180000 });
    await page.getByRole("button", { name: "Browse the shop", exact: true }).click();
    await page.getByText("111 products", { exact: true }).waitFor();
    async function capture(screen) {
      await page.screenshot({ path: `${folder}/${screen}-${width}.png` });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`${screen} overflows at ${width}`);
      const clipped = await page.getByRole("tab").evaluateAll(tabs => tabs.some(tab => tab.getBoundingClientRect().bottom > innerHeight + 1));
      if (clipped) throw new Error(`Navigation clips at ${width}`);
      results.push({ screen, width, overflow, navigationClipped: clipped });
    }
    await capture("home");
    const search = page.getByRole("textbox", { name: "Search products" });
    await search.fill("USB microphone"); await page.getByText("1 products", { exact: true }).waitFor();
    await page.getByRole("button", { name: "View USB Podcast Microphone", exact: true }).waitFor();
    await search.fill("");
    await page.getByRole("tab", { name: "Categories", exact: true }).click();
    await page.getByRole("button", { name: "Home Appliances", exact: true }).click();
    await page.getByText("Shop all 10 products", { exact: false }).waitFor(); await capture("categories");
    await page.getByRole("tab", { name: "You", exact: true }).click();
    await page.getByRole("button", { name: "Sign in or create an account", exact: true }).waitFor(); await capture("account");
    await page.getByRole("tab", { name: "Cart", exact: true }).click();
    await page.getByText("Sign in to see your cart", { exact: true }).waitFor();
    await expect(page.getByRole("tab")).toHaveCount(0); await capture("cart-guest");
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await page.getByRole("tab", { name: "You", exact: true }).click();
    await page.getByRole("button", { name: "Settings", exact: true }).click();
    await page.getByRole("radio", { name: "Light", exact: true }).click();
    await capture("settings");
    await page.getByRole("radio", { name: "Dark", exact: true }).click(); await capture("settings-dark");
    if (errors.length) throw new Error(errors.join("\n"));
    await context.close();
  }
  await writeFile(`${folder}/audit.json`, JSON.stringify(results, null, 2));
  console.log(`Passed ${results.length} screen/viewport captures, search, categories and route-specific navigation.`);
} finally { await browser.close(); }
