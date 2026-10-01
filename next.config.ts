import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server-only secrets must never be exposed to the browser.
  // Env vars used here are read exclusively in server modules.
};

export default nextConfig;
