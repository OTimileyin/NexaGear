/**
 * Executes the project-owned gates declared in .forge/verification/gates.json
 * and writes objective evidence to .forge/verification/last-run.yaml.
 *
 * Safety rules this runner honours:
 *  - It executes ONLY commands literally present in gates.json. Nothing is
 *    discovered from the repository and executed implicitly.
 *  - Every command is printed before it runs.
 *  - A gate is reported `blocked`, never `passed`, when its inputs are absent.
 *  - Gates whose failure would materially affect correctness, security, or
 *    production readiness are `required: true` and fail the exit code.
 *
 * Zero dependencies by design: gates.json is JSON so no YAML parser is needed.
 */
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const GATES_FILE = join(ROOT, ".forge", "verification", "gates.json");
const OUT_FILE = join(ROOT, ".forge", "verification", "last-run.yaml");
const SCAN_TARGETS = [".next/static"];

if (!existsSync(GATES_FILE)) {
  console.error("No gates.json found. FORGE cannot verify this project yet.");
  process.exit(2);
}

const spec = JSON.parse(readFileSync(GATES_FILE, "utf8"));
const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const selected = only.length
  ? spec.gates.filter((g) => only.includes(g.id))
  : spec.gates;

if (!selected.length) {
  console.error(`No gate matched: ${only.join(", ")}`);
  process.exit(2);
}

const results = [];
let blocked = false;
const startedAt = new Date().toISOString();

for (const gate of selected) {
  if (gate.enableWhenEnv && !process.env[gate.enableWhenEnv]) {
    results.push({ ...gate, status: "skipped", duration_ms: 0, evidence_ids: [] });
    console.log(`- ${gate.id}: skipped (set ${gate.enableWhenEnv}=1 to enable)`);
    continue;
  }

  for (const dep of gate.dependsOn ?? []) {
    const depGate = results.find((r) => r.id === dep);
    if (!depGate || depGate.status !== "passed") {
      blocked = true;
      results.push({
        ...gate,
        status: "blocked",
        duration_ms: 0,
        evidence_ids: [],
        blocked_reason: `Dependency gate '${dep}' did not pass.`,
      });
      console.log(`- ${gate.id}: blocked (dependency '${dep}' did not pass)`);
      break;
    }
  }
  if (results.some((r) => r.id === gate.id)) continue;

  for (const target of SCAN_TARGETS) {
    if (gate.command.includes(target) && !existsSync(join(ROOT, target))) {
      blocked = true;
      results.push({
        ...gate,
        status: "blocked",
        duration_ms: 0,
        evidence_ids: [],
        blocked_reason: `${target} does not exist; run the build gate first.`,
      });
      console.log(`- ${gate.id}: blocked (${target} missing)`);
      break;
    }
  }
  if (results.some((r) => r.id === gate.id)) continue;

  console.log(`\n$ ${gate.command}`);
  const started = Date.now();
  const proc = spawnSync(gate.command, {
    cwd: ROOT,
    shell: true,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const duration = Date.now() - started;
  const output = `${proc.stdout ?? ""}${proc.stderr ?? ""}`.trim();
  if (output) console.log(output.split("\n").slice(-12).join("\n"));

  const status = proc.status === 0 ? "passed" : "failed";
  results.push({ ...gate, status, duration_ms: duration, evidence_ids: [] });
  console.log(`- ${gate.id}: ${status} (${(duration / 1000).toFixed(1)}s)`);
}

const failed = results.filter((r) => r.status === "failed");
const releaseDecision = failed.length ? "fail" : blocked ? "blocked" : "pass";
const completedAt = new Date().toISOString();

const lines = [
  "verification:",
  `  run_id: verify-${Date.now().toString(36)}`,
  `  started_at: "${startedAt}"`,
  `  completed_at: "${completedAt}"`,
  `  risk: ${spec.risk}`,
  "  checks:",
  ...results.map((r) => [
    `    - id: ${r.id}`,
    `      category: ${r.category}`,
    `      status: ${r.status}`,
    `      command: ${JSON.stringify(r.command)}`,
    `      summary: ${JSON.stringify(r.summary)}`,
    `      duration_ms: ${r.duration_ms}`,
    "      evidence_ids: []",
    ...(r.blocked_reason ? [`      blocked_reason: ${JSON.stringify(r.blocked_reason)}`] : []),
  ].join("\n")),
  `  release_decision: ${releaseDecision}`,
  "",
];
writeFileSync(OUT_FILE, lines.join("\n"));

console.log(`\nrelease_decision: ${releaseDecision}`);
console.log(`evidence written to .forge/verification/last-run.yaml`);

if (results.some((r) => r.status === "skipped")) {
  console.log("note: some gates were skipped; a skip is not a pass.");
}
process.exit(releaseDecision === "pass" ? 0 : 1);