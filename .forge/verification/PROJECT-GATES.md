# Project Verification Gates

These are **NexaGear's** gates. FORGE ships the framework; this directory is the
project's own evidence contract. It is deliberately additive — nothing in
FORGE's own policies has been modified.

## Run them

```bash
npm run verify
```

Runs every gate and writes `.forge/verification/last-run.yaml`. Exit code is `0`
only when `release_decision: pass`.

Run a subset by gate id:

```bash
npm run verify -- typecheck lint
npm run verify -- build secrets-in-bundle
```

Enable the Playwright journey (needs a dev server on port 64820):

```bash
FORGE_E2E=1 npm run verify -- e2e
```

## Why this exists separately from `forge validate`

`forge validate` deliberately **does not** execute project commands. It checks
seven required file paths and three context enum fields, and it runs `cue vet`
when the CUE CLI is installed. That is by design — FORGE records evidence, it
does not silently run whatever it discovers in your repository.

So `forge validate` can tell you the framework is installed. It can never tell
you the build is green. `npm run verify` is what closes that gap, and it only
executes commands that are literally written down in `gates.json`.

## The gates

| id | category | command | required |
| --- | --- | --- | --- |
| `typecheck` | type | `npm run typecheck` | yes |
| `lint` | lint | `npm run lint -- --max-warnings=0` | yes |
| `unit` | unit | `npm test` | yes |
| `build` | build | `npm run build` | yes |
| `e2e` | e2e | `npm run test:e2e` | no (skipped unless `FORGE_E2E=1`) |
| `secrets-in-bundle` | security | `node .forge/verification/check-bundle-secrets.mjs` | yes, after `build` |

`secrets-in-bundle` is what turns the [AGENTS.md](../../../AGENTS.md) rule "no
secrets in the client bundle (grep build output)" into an executable check. It
detects by secret *value shape* — provider key prefixes and `service_role` JWT
claims — so it never reads, parses, or prints a secret. Publishable keys
(`pk_test_`, `pk_live_`) and variable names are allowlisted.

## Reading the result honestly

- `passed` / `failed` / `skipped` / `blocked` are distinct. A **skip is not a
  pass**, and a gate whose input is missing reports `blocked`, never `passed`.
- `blocked` is the correct answer when a dependency did not pass. That is why
  `secrets-in-bundle` refuses to scan before `build` has produced `.next/static`.
- This machine is slow enough that a full back-to-back `npm run verify` can
  time out a Vitest worker (`Timeout waiting for worker to respond`). That is a
  machine-load artifact, not a product regression. Re-run the gate alone to
  confirm, and record it as `UNVERIFIED` until it passes.
- Per [AGENTS.md](../../../AGENTS.md) §5, provider-dependent flows that have not
  been exercised end to end stay `IMPLEMENTED / UNVERIFIED`. No gate here can
  promote them.

## Adding a gate

Append to `gates.json`. The runner only needs `id`, `category`, `command`,
`required`, and `summary`. Optional: `dependsOn` (gate ids that must pass first)
and `enableWhenEnv` (env var name that must be set, otherwise skipped). `id` must
match `^[a-z][a-z0-9-]*$` and `category` must be one of the values in
`.forge/schemas/verification.cue`.