import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const origin = "https://nexagear.vercel.app";
await mkdir("test-results/vercel", { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = []; page.on("pageerror", error => errors.push(error.message));
  let response = await page.goto(origin, { timeout: 60000 });
  await page.getByRole("heading", { name: /Make room.*next idea/ }).waitFor();
  results.push({ route: "/", status: response.status(), landing: true });
  await page.screenshot({ path: "test-results/vercel/home.png" });
  response = await page.goto(`${origin}/shop`, { timeout: 60000 });
  await page.getByText("111 products", { exact: true }).waitFor();
  results.push({ route: "/shop", status: response.status(), products: 111 });
  await page.screenshot({ path: "test-results/vercel/shop.png" });
  await page.getByRole("textbox", { name: "Search products", exact: true }).fill("USB microphone");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page.getByRole("heading", { name: "USB Podcast Microphone", exact: true }).waitFor();
  results.push({ check: "Live search", passed: true });
  const image = await fetch(`${origin}/images/catalog/monitor.webp`);
  if (!image.ok) throw new Error(`Catalogue photograph HTTP ${image.status}`);
  for (const route of ["checkout", "payment", "payment/verify"]) {
    const response = await fetch(`${origin}/api/mobile/${route}${route === "payment/verify" ? "?reference=00000000-0000-4000-8000-000000000000" : ""}`, { method: route === "payment/verify" ? "GET" : "POST", headers: { "Content-Type": "application/json" }, ...(route === "payment/verify" ? {} : { body: "{}" }) });
    if (response.status !== 401) throw new Error(`Mobile ${route} expected auth rejection; HTTP ${response.status}`);
    const data = await response.json();
    if (data.ok !== false) throw new Error("API did not reject unsigned access");
    results.push({ route: `/api/mobile/${route}`, status: response.status, authGate: true });
  }
  if (errors.length) throw new Error(errors.join("\n"));
  await writeFile("test-results/vercel/smoke.json", JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
