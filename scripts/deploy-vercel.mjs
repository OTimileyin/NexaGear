import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawn } from "node:child_process";
const local = await readFile(".env.local", "utf8");
function value(key) { return process.env[key] || local.match(new RegExp(`^${key}=(.*)$`, "m"))?.[1]?.trim().replace(/^"|"$/g, ""); }
const token = value("VERCEL_TOKEN");
if (!token) throw new Error("Vercel deployment credential missing.");
const project = JSON.parse(await readFile(".vercel/project.json", "utf8"));
const paymentKey = value("PAYSTACK_SECRET_KEY");
if (paymentKey) {
  if (!paymentKey.startsWith("sk_test_")) throw new Error("Deployment requires the configured Paystack test key.");
  const response = await fetch(`https://api.vercel.com/v10/projects/${project.projectId}/env?teamId=${project.orgId}&upsert=true`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ key: "PAYSTACK_SECRET_KEY", value: paymentKey, type: "encrypted", target: ["production"] }) });
  if (!response.ok) throw new Error(`Payment environment configuration HTTP ${response.status}`);
  console.log("Configured the Paystack test secret in the Vercel server environment.");
} else console.log("Paystack test key is missing locally; payment configuration was not changed.");
const cache = join(process.env.LOCALAPPDATA, "npm-cache", "_npx");
let cli;
for (const folder of await readdir(cache)) {
  const candidate = join(cache, folder, "node_modules", "vercel", "dist", "index.js");
  try { await readFile(candidate); cli = candidate; break; } catch { /* Next cached CLI. */ }
}
if (!cli) throw new Error("Cached Vercel CLI missing.");
const child = spawn(process.execPath, [cli, "deploy", "--prod", "--yes", "--token", token], { stdio: "inherit", env: { ...process.env, VERCEL_TELEMETRY_DISABLED: "1" } });
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
await new Promise(resolve => child.on("close", code => { process.exitCode = code ?? 1; resolve(); }));
