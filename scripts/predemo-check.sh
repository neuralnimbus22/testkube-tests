#!/usr/bin/env bash
#
# predemo-check.sh — Pre-Demo Sanity Check
#
# Run this on your laptop BEFORE a TestKube demo. It verifies the parts of the
# environment that TestKube itself cannot verify (because they're upstream of
# TestKube): Docker, the Kubernetes cluster, the Online Boutique workload,
# the TestKube agent pod, the standalone Postgres/Redis containers used by
# the API-layer demo, and that the frontend actually serves a page.
#
# Checks run IN ORDER and FAIL FAST on critical failures: if Docker isn't
# running, nothing else can work, so we abort early. Soft issues (apilayer
# containers stopped) are WARN, not FAIL.
#
# Output uses plain [OK]/[FAIL]/[WARN] markers — no unicode, no colors — so
# it copies cleanly between terminals and into chat.

# pipefail makes `cmd1 | cmd2` return non-zero if either cmd fails.
# We deliberately DON'T `set -e` because we want to handle each check's
# failure explicitly (counting it, printing a hint, then continuing).
set -o pipefail

# ---------------------------------------------------------------------------
# Counters and helpers
# ---------------------------------------------------------------------------

PASS=0      # count of [OK] checks
FAIL=0      # count of [FAIL] checks (these break the verdict)
WARN=0      # count of [WARN] checks (informational, don't break the verdict)

# FAILED_CHECKS collects the [FAIL] messages so we can re-print them in
# the final summary block.
FAILED_CHECKS=()

ok()      { echo "[OK]   $*";  PASS=$((PASS + 1)); }
fail()    { echo "[FAIL] $*";  FAIL=$((FAIL + 1)); FAILED_CHECKS+=("$*"); }
warn()    { echo "[WARN] $*";  WARN=$((WARN + 1)); }
hint()    { echo "       hint: $*"; }
section() { echo; echo "--- $* ---"; }

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------

echo "=== Pre-Demo Sanity Check ==="
echo "Time: $(date '+%Y-%m-%d %H:%M:%S')"
echo "Host: $(whoami)@$(hostname -s)"

# ---------------------------------------------------------------------------
# Check 1: Docker daemon reachable?
# ---------------------------------------------------------------------------
# 'docker info' contacts the Docker daemon and prints system info. If the
# daemon (i.e. Docker Desktop) isn't running, the command exits non-zero.
# We redirect both stdout and stderr to /dev/null because we only care about
# the exit code at this point — clean output is the goal.
section "1. Docker"
if docker info > /dev/null 2>&1; then
  ok "Docker daemon is running"
else
  fail "Docker Desktop is not running"
  hint "Start Docker Desktop and wait until its icon stops animating"
  echo
  echo "ABORTING — nothing else in this script can work without Docker."
  exit 1
fi

# ---------------------------------------------------------------------------
# Check 2: Kubernetes cluster reachable?
# ---------------------------------------------------------------------------
# 'kubectl get nodes' makes an API call to the Kubernetes control plane.
# It returns non-zero if the cluster is down, the kubeconfig context is
# wrong, or auth is broken. Either way we can't run cluster checks below.
section "2. Kubernetes cluster"
if kubectl get nodes > /dev/null 2>&1; then
  # Print one line per node so it's obvious which cluster/context you're
  # actually talking to. `read` parses each row into name/status/etc.
  while read -r name status _; do
    [ "$name" = "NAME" ] && continue          # skip the header row
    ok "Node $name -> $status"
  done < <(kubectl get nodes 2>/dev/null)
else
  fail "Kubernetes cluster not reachable"
  hint "Ensure Docker Desktop Kubernetes is enabled and started"
  echo
  echo "ABORTING — cluster checks below cannot proceed."
  exit 1
fi

# ---------------------------------------------------------------------------
# Check 3: Online Boutique workload healthy?
# ---------------------------------------------------------------------------
# We iterate over every Deployment in the online-boutique namespace and
# compare desired vs available replicas. A Deployment is considered healthy
# when status.replicas == status.availableReplicas — this also makes
# scaled-to-zero deployments (like 'loadgenerator') correctly report healthy
# (0/0), because zero desired and zero available agree with each other.
section "3. Online Boutique deployments"
NS_OB="online-boutique"
FRONTEND_OK=0      # set to 1 below if the frontend deployment is healthy

if ! kubectl get ns "$NS_OB" > /dev/null 2>&1; then
  fail "Namespace '$NS_OB' does not exist"
  hint "Deploy Online Boutique (kubectl apply -k <manifests>)"
else
  TOTAL=0
  HEALTHY=0
  # The jsonpath template emits "<name> <desired> <available>" one line per
  # deployment. We default missing numbers to 0 with ${var:-0} for safe
  # arithmetic — availableReplicas is absent on a brand-new deployment.
  while read -r name desired available; do
    [ -z "$name" ] && continue
    desired=${desired:-0}
    available=${available:-0}
    TOTAL=$((TOTAL + 1))
    if [ "$desired" = "$available" ]; then
      ok "$name $available/$desired"
      HEALTHY=$((HEALTHY + 1))
      [ "$name" = "frontend" ] && FRONTEND_OK=1
    else
      fail "$name $available/$desired"
    fi
  done < <(
    kubectl -n "$NS_OB" get deployments \
      -o jsonpath='{range .items[*]}{.metadata.name}{" "}{.status.replicas}{" "}{.status.availableReplicas}{"\n"}{end}'
  )
  echo "       summary: $HEALTHY/$TOTAL deployments healthy"
fi

# ---------------------------------------------------------------------------
# Check 4: TestKube agent running?
# ---------------------------------------------------------------------------
# The agent runs as a Deployment in the 'local-laptop' namespace. We look
# for a pod whose name contains 'testkube' in Running state with READY
# count satisfied (i.e. ready==total, both non-zero — e.g. "1/1").
#
# IMPORTANT: this only proves the pod is up locally in your cluster. It
# does NOT prove the agent has an open connection to TestKube Cloud — if
# a cloud-triggered run hangs even though this check passes, verify the
# agent's connection status in the TestKube Cloud dashboard.
section "4. TestKube agent"
NS_TK="local-laptop"
# awk pulls the Running pod whose name contains 'testkube' and whose
# ready column is N/N with N!=0. split($2, a, "/") splits "1/1" into a[1]=1, a[2]=1.
if kubectl -n "$NS_TK" get pods --no-headers 2>/dev/null \
   | awk '/testkube/ && $3 == "Running" {
            split($2, a, "/");
            if (a[1] == a[2] && a[1] != "0") found = 1
          } END { exit !found }'; then
  ok "TestKube agent pod running in namespace '$NS_TK'"
  echo "       note: pod-up != cloud connection. If a cloud-triggered run hangs,"
  echo "             also verify the agent's status in the TestKube Cloud dashboard."
else
  fail "TestKube agent not running in namespace '$NS_TK'"
  hint "Inspect with: kubectl -n $NS_TK get pods; agent deployment may need a restart"
fi

# ---------------------------------------------------------------------------
# Check 5: Standalone Postgres + Redis (apilayer demo)
# ---------------------------------------------------------------------------
# These are 'docker run' containers — NOT Kubernetes resources. They're
# only needed when demoing the online-boutique-apilayer service locally,
# so missing/stopped containers are WARN (informational), not FAIL.
#
# 'docker ps' shows only running containers; 'docker ps -a' shows all
# containers (including stopped). We distinguish three states:
#   - running     → [OK]
#   - exists but stopped → [WARN] with 'docker start' hint
#   - missing entirely   → [WARN] with the 'docker run' hint
section "5. Standalone Postgres + Redis (apilayer demo)"
for c in apilayer-postgres apilayer-redis; do
  # --filter "name=^${c}$" anchors the name match to avoid partial matches
  # like 'apilayer-postgres-test'. --format prints just the name column.
  if docker ps --filter "name=^${c}$" --format '{{.Names}}' | grep -q "^${c}$"; then
    ok "$c container running"
  elif docker ps -a --filter "name=^${c}$" --format '{{.Names}}' | grep -q "^${c}$"; then
    warn "$c container exists but is not running"
    hint "Run: docker start $c"
  else
    warn "$c container does not exist"
    hint "Re-run the docker run commands from online-boutique-apilayer/ARCHITECTURE.md"
  fi
done

# ---------------------------------------------------------------------------
# Check 6: Frontend serves HTTP 200?
# ---------------------------------------------------------------------------
# The frontend Service is ClusterIP, so it isn't reachable from the laptop
# directly. We start a short-lived port-forward to a temp port (18080),
# probe http://localhost:18080, then tear the port-forward down.
#
# Cleanup must be bulletproof — orphaned 'kubectl port-forward' processes
# silently hold their target port across runs. We set an EXIT trap right
# after starting the background process so cleanup runs even if curl
# fails, the script is Ctrl-C'd, etc.
section "6. Frontend HTTP probe"
if [ "${FRONTEND_OK:-0}" -ne 1 ]; then
  warn "Skipping HTTP probe — frontend deployment was not healthy in check 3"
else
  PROBE_PORT=18080
  PF_LOG=$(mktemp -t pf-probe.XXXXXX)

  # Start the port-forward in the background; capture PID for cleanup.
  kubectl -n "$NS_OB" port-forward svc/frontend ${PROBE_PORT}:80 > "$PF_LOG" 2>&1 &
  PF_PID=$!

  cleanup_pf() {
    # kill -0 tests whether the process is alive without sending a real signal.
    if [ -n "${PF_PID:-}" ] && kill -0 "$PF_PID" 2>/dev/null; then
      kill "$PF_PID" 2>/dev/null
      # 'wait' reaps the child so it doesn't show up as a zombie.
      wait "$PF_PID" 2>/dev/null
    fi
    rm -f "$PF_LOG"
  }
  trap cleanup_pf EXIT

  # The forward takes ~0.5-1s to bind locally. Retry a few times before
  # giving up, so we don't fail just because we asked too early.
  ready=0
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if curl -s -o /dev/null --max-time 1 "http://localhost:${PROBE_PORT}" 2>/dev/null; then
      ready=1
      break
    fi
    sleep 0.5
  done

  if [ $ready -eq 1 ]; then
    # %{http_code} is curl's format-string variable for the HTTP status.
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://localhost:${PROBE_PORT}")
    if [ "$code" = "200" ]; then
      ok "Frontend serves HTTP 200 (via temporary port-forward)"
    else
      fail "Frontend probe returned HTTP $code (expected 200)"
    fi
  else
    # Port-forward never became reachable — fall back to verifying the pod
    # itself is Ready. This is the documented graceful-degradation path.
    pod_ready=$(kubectl -n "$NS_OB" get pod -l app=frontend \
                 -o jsonpath='{.items[*].status.containerStatuses[*].ready}' 2>/dev/null)
    case "$pod_ready" in
      *true*) warn "Could not establish port-forward probe; frontend pod IS Ready (fallback)" ;;
      *)      fail "Port-forward probe failed AND frontend pod is not Ready" ;;
    esac
  fi

  cleanup_pf
  trap - EXIT
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo
echo "=== Summary ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo "Warned: $WARN"
echo

if [ $FAIL -eq 0 ]; then
  echo "[PASS] ALL CLEAR — safe to demo"
  exit 0
else
  echo "[FAIL] NOT READY — fix items above before demoing:"
  for item in "${FAILED_CHECKS[@]}"; do
    echo "  - $item"
  done
  exit 1
fi
