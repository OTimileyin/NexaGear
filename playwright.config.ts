import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:64820",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev -- --port 64820",
    url: "http://localhost:64820",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
