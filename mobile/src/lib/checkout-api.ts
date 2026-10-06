import Constants from "expo-constants";
import { Platform } from "react-native";

/** Public API origin: configurable in cloud builds; use Metro's host during local testing. */
export function checkoutOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (__DEV__) {
    if (Platform.OS === "web") return "http://localhost:3000";
    const host = Constants.expoConfig?.hostUri?.split(":")[0];
    if (host && !host.endsWith(".exp.direct")) return `http://${host}:3000`;
  }
  throw new Error("Checkout is not configured for this build. Set EXPO_PUBLIC_API_URL to the updated NexaGear backend and restart the app.");
}

export async function checkoutRequest(path: string, token: string | null, body?: unknown): Promise<Record<string, unknown>> {
  if (!token) throw new Error("Your session expired. Sign in again before checking out.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  let response: Response;
  try { response = await fetch(`${checkoutOrigin()}/api/mobile/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    signal: controller.signal,
  }); } finally { clearTimeout(timeout); }
  const result: unknown = await response.json().catch(() => null);
  if (!result || typeof result !== "object") throw new Error("Checkout could not reach the updated store. Check your connection and retry.");
  const data = result as Record<string, unknown>;
  if (!response.ok) throw new Error(typeof data.message === "string" ? data.message : "Checkout could not continue. Retry or sign in again.");
  return data;
}
