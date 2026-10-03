/**
 * Fails if a real secret value is found inside the built client bundle.
 *
 * Detection is by secret *value shape* (provider-issued prefixes and JWT role
 * claims), not by comparing against .env, so this script never reads, parses,
 * or logs a secret. It runs after `npm run build` and reads only .next/static,
 * which is what the browser can actually download.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const BUNDLE = join(ROOT, ".next", "static");

// Secret *values* that must never ship to the browser.
const FORBIDDEN = [
  { name: "Supabase secret key", pattern: /sb_secret_[A-Za-z0-9_-]{10,}/g },
  { name: "Supabase legacy JWT secret", pattern: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g },
  { name: "service_role claim", pattern: /"role"\s*:\s*"service_role"/g },
  { name: "Stripe secret key", pattern: /\bsk_(live|test)_[A-Za-z0-9]{10,}/g },
  { name: "Paystack secret key", pattern: /\bsk_live_[A-Za-z0-9]{10,}/g },
  { name: "private key block", pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g },
  { name: "Clerk secret key", pattern: /\bsk_(live|test)_[A-Za-z0-9]{20,}/g },
];

// Publishable keys and variable *names* are safe: they carry no authority.
const ALLOWED_CONTEXT = [
  "pk_test_",
  "pk_live_",
  "CLERK_SECRET_KEY", // the name, from Clerk's own SDK — not a value
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
];

if (!existsSync(BUNDLE)) {
  console.log("! .next/static not found. Run `npm run build` before this gate.");
  process.exit(2); // blocked, not passed
}

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(js|css|html|json|map|txt)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(BUNDLE);
const findings = [];

for (const file of files) {
  const text = readFileSync(file, "utf8");
  for (const { name, pattern } of FORBIDDEN) {
    pattern.lastIndex = 0;
    for (const match of text.matchAll(pattern)) {
      const start = Math.max(0, match.index - 120);
      const window = text.slice(start, match.index + match[0].length + 40);
      if (ALLOWED_CONTEXT.some((ok) => window.includes(ok))) continue;
      // Never print the secret; print the file and the shape only.
      findings.push({ file: relative(ROOT, file), kind: name, length: match[0].length });
    }
  }
}

console.log(`Scanned ${files.length} client-bundle files under .next/static.`);
if (findings.length === 0) {
  console.log("No secret values found in the client bundle.");
  process.exit(0);
}
console.error(`\n${findings.length} possible secret value(s) in the client bundle:`);
for (const f of findings) console.error(`  - ${f.file}: ${f.kind} (${f.length} chars, value withheld)`);
console.error("\nTreat this as a blocking finding: rotate the credential, then rebuild.");
process.exit(1);