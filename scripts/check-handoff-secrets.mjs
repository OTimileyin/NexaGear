import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
const config = readFileSync(".env.local", "utf8");
const privateValues = config.split(/\r?\n/).flatMap(line => {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (!match || match[1].startsWith("NEXT_PUBLIC_") || !/(KEY|TOKEN|SECRET|PASSWORD)$/.test(match[1])) return [];
  const value = match[2].trim().replace(/^"|"$/g, "");
  return value.length >= 12 ? [{ name: match[1], value }] : [];
});
const files = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const findings = [];
for (const file of files) {
  if (file === "NEXAGEAR-CREDENTIALS.md.gpg") continue;
  const bytes = execFileSync("git", ["show", `:${file}`], { maxBuffer: 15 * 1024 * 1024 });
  if (bytes.includes(0)) continue;
  const text = bytes.toString("utf8");
  for (const secret of privateValues) if (text.includes(secret.value)) findings.push({ file, kind: secret.name });
  for (const [kind, pattern] of [["provider secret", /\b(?:sb_secret_|sbp_|vcp_|GOCSPX-)[A-Za-z0-9_-]{12,}/], ["private auth/payment key", /\bsk_(?:test|live)_[A-Za-z0-9]{20,}/], ["private signing key", /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/]]) {
    if (pattern.test(text)) findings.push({ file, kind });
  }
}
const trackedEnvs = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(file => /(^|\/)\.env(?:$|\.)/.test(file) && !file.endsWith(".env.example"));
for (const file of trackedEnvs) findings.push({ file, kind: "tracked private environment file" });
console.log(JSON.stringify({ stagedFilesScanned: files.length, privateCredentialValuesChecked: privateValues.length, findings }, null, 2));
if (findings.length) process.exitCode = 1;
