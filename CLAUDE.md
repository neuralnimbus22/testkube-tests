# CLAUDE.md — testkube-tests

## What this is
A TestKube-driven test suite for Google's **Online Boutique** microservices demo running locally on Kubernetes. Today it ships one framework (Playwright) plus the supporting plumbing (RBAC manifest, pre-demo environment check). The repo README mentions Postman and k6 as in-scope too — none checked in yet.

## Architecture
```
TestKube TestWorkflows (defined elsewhere, in TestKube control plane)
    │  fetch + run
    ▼
playwright/  ──────►  Online Boutique frontend (http://localhost:8080
                      via port-forward, or in-cluster Service DNS)
                      │
                      ▼ exercises microservices behind the frontend
                      productcatalog, cart, currency, checkout, …
```
- `playwright/` is what TestKube actually executes. Reporter mode is selectable: `PW_REPORTER=blob` → `blob-report/` (mergeable across shards), unset → `playwright-report/` (single HTML). Both output dirs are anchored to the config dir so TestKube's artifact collector finds them regardless of cwd.
- `infra-rbac.yaml` lets TestKube's executor SA (`exec-sa-testkube-local-laptop` in `local-laptop`) `get`/`list` pods/services/endpoints/deployments/replicasets in the `online-boutique` namespace.

## Key directories
| Path | Contents |
|---|---|
| `playwright/playwright.config.ts` | Three browser projects (chromium/firefox/webkit). `baseURL` from `BASE_URL` env, default `http://localhost:8080`. |
| `playwright/tests/` | 8 numbered specs `01-homepage.spec.ts` → `08-navigation.spec.ts`, an older `storefront.spec.ts`, and the boilerplate `example.spec.ts`. |
| `playwright/package.json` | `@playwright/test ^1.60.0`, `@types/node`. No `scripts` — invoke playwright directly. |
| `scripts/predemo-check.sh` | Pre-demo environment sanity check. |
| `infra-rbac.yaml` | RBAC for TestKube executor → `online-boutique` namespace. |

## How to run
**Install + browsers (one-time):**
```bash
cd playwright && npm install && npx playwright install
```

**Run the suite locally (against a port-forwarded Online Boutique frontend):**
```bash
cd playwright
BASE_URL=http://localhost:8080 npx playwright test          # all browsers
BASE_URL=http://localhost:8080 npx playwright test --project=chromium
PW_REPORTER=blob BASE_URL=… npx playwright test --shard=1/4 # sharded run
```

**Pre-demo environment check:**
```bash
./scripts/predemo-check.sh
```
Verifies Docker, k8s cluster, all Online Boutique deployments healthy, TestKube agent pod up, apilayer containers (WARN-only), and an HTTP probe of the frontend via temp port-forward.

**Apply the RBAC (one-time, when wiring up TestKube against this cluster):**
```bash
kubectl apply -f infra-rbac.yaml
```

## Conventions / gotchas
- **Test execution model**: tests target a **running** app. They do not boot anything themselves. Expect a port-forward (or in-cluster Service DNS for in-cluster runs).
- **`BASE_URL` env is the single config point** for where the frontend lives. Default `http://localhost:8080`.
- **Reporter selection is env-var-driven, not CLI**: `PW_REPORTER=blob` switches output. Don't pass `--reporter` on CLI — the config wins.
- **Output paths are absolute (`__dirname`-anchored)**. Files always land at `playwright/playwright-report/` and `playwright/blob-report/` regardless of where you launched playwright from.
- **TestKube context**: the agent runs in namespace `local-laptop`; the workload under test runs in namespace `online-boutique`. Cross-namespace access requires `infra-rbac.yaml` to be applied.
- **TestWorkflows are NOT in this repo** — they live in the TestKube control plane.

## Common tasks
- **Add a new Playwright spec** → `playwright/tests/NN-name.spec.ts`. Use the existing specs as a pattern: `await page.goto('/')` (relative — `baseURL` does the rest), screenshots via `testInfo.outputPath(...)`, no hardcoded URLs.
- **Tune sharding behavior** → `playwright.config.ts`. The `PW_REPORTER === 'blob'` branch is what sharded TestKube workflows use.
- **Debug an environment that "should work but doesn't"** → run `scripts/predemo-check.sh` first. It catches the things TestKube itself can't tell you about (Docker down, agent pod gone, frontend pod unhealthy).
- **Change the test target** → set `BASE_URL` in the TestKube workflow env, or locally before invoking playwright. No config change needed.
