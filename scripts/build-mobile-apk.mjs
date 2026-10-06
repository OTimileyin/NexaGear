import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";
const mobile = resolve("mobile");
const source = await readFile(join(mobile, ".env"), "utf8");
const cache = join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
let cli;
for (const directory of await readdir(cache)) {
  const candidate = join(cache, directory, "node_modules", "eas-cli", "bin", "run");
  try { await readFile(candidate); cli = candidate; break; } catch { /* Next cached CLI. */ }
}
if (!cli) throw new Error("Cached EAS CLI is unavailable.");
async function run(args) {
  const child = spawn(process.execPath, [cli, ...args], { cwd: mobile, stdio: "inherit", env: { ...process.env, EXPO_NO_TELEMETRY: "1" } });
  const code = await new Promise((accept, reject) => { child.on("error", reject); child.on("close", accept); });
  if (code !== 0) throw new Error(`EAS ${args[0]} failed (exit ${code}).`);
}
for (const key of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SUPABASE_ANON_KEY", "EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY"]) {
  const value = process.env[key] || source.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, "");
  if (!value) throw new Error(`${key} is missing from mobile/.env.`);
  await run(["env:create", "preview", "--name", key, "--value", value, "--visibility", "plaintext", "--force", "--non-interactive"]);
}
await run(["build", "--platform", "android", "--profile", "preview", "--non-interactive", "--no-wait", "--message", "NexaGear compact shopping UI and live checkout backend"]);
