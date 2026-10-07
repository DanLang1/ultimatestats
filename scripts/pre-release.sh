#!/usr/bin/env bash
#
# Pre-release health check.
#
# Runs every repository gate (format, lint, typecheck, Jest + coverage, oxlint
# plugin tests, and the full Maestro device suite), then prints a single report
# so you can confirm the tree is healthy before cutting a release.
#
# Every step runs even if an earlier one fails, so the report shows the full
# picture. The script exits non-zero if any step failed.
#
# Usage:
#   npm run pre-release          # everything, including all Maestro flows
#   npm run pre-release:fast     # skip the slow device suite
#   bash scripts/pre-release.sh --skip-maestro
#
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

LOG_DIR="$ROOT_DIR/.pre-release-logs"

SKIP_MAESTRO=0
for arg in "$@"; do
  case "$arg" in
    --skip-maestro) SKIP_MAESTRO=1 ;;
    -h | --help)
      cat <<'USAGE'
Pre-release health check.

Runs every repository gate (format, lint, typecheck, Jest + coverage, oxlint
plugin tests, and the full Maestro device suite), then prints a single report
so you can confirm the tree is healthy before cutting a release.

Every step runs even if an earlier one fails, so the report shows the full
picture. The script exits non-zero if any step failed.

Usage:
  npm run pre-release          # everything, including all Maestro flows
  npm run pre-release:fast     # skip the slow device suite
  bash scripts/pre-release.sh --skip-maestro
USAGE
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Run with --help for usage." >&2
      exit 2
      ;;
  esac
done

if [ -t 1 ]; then
  BOLD=$'\033[1m'
  GREEN=$'\033[32m'
  RED=$'\033[31m'
  YELLOW=$'\033[33m'
  DIM=$'\033[2m'
  RESET=$'\033[0m'
else
  BOLD=''
  GREEN=''
  RED=''
  YELLOW=''
  DIM=''
  RESET=''
fi

rm -rf "$LOG_DIR"
mkdir -p "$LOG_DIR"

STEP_NAMES=()
STEP_STATUS=()
STEP_SECONDS=()
STEP_LOGS=()

run_step() {
  local name="$1"
  shift
  local log="$LOG_DIR/${name//[^A-Za-z0-9]/-}.log"

  printf '\n%s==== %s ====%s\n' "$BOLD" "$name" "$RESET"

  local start=$SECONDS
  "$@" 2>&1 | tee "$log"
  local status=${PIPESTATUS[0]}
  local elapsed=$((SECONDS - start))

  STEP_NAMES+=("$name")
  STEP_SECONDS+=("$elapsed")
  STEP_LOGS+=("$log")
  if [ "$status" -eq 0 ]; then
    STEP_STATUS+=("PASS")
  else
    STEP_STATUS+=("FAIL")
  fi
}

echo "${BOLD}Pre-release checks${RESET}"
echo "${DIM}Working tree: $ROOT_DIR${RESET}"

run_step "format" npm run format:check
run_step "lint" npm run lint
run_step "typecheck" npm run typecheck
run_step "tests+coverage" npx jest --coverage
run_step "oxlint-tests" npm run test:oxlint

if [ "$SKIP_MAESTRO" -eq 0 ]; then
  run_step "maestro-all" npm run maestro:all
fi

COVERAGE_SUMMARY=""
if [ -f "$LOG_DIR/tests-coverage.log" ]; then
  COVERAGE_SUMMARY=$(
    grep -m1 '^All files' "$LOG_DIR/tests-coverage.log" |
      awk -F'|' '{
        gsub(/ /, "", $2); gsub(/ /, "", $3); gsub(/ /, "", $4);
        print "stmts " $2 "%  branch " $3 "%  funcs " $4 "%"
      }'
  )
fi

GIT_BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')"
GIT_COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"
GIT_DIRTY=""
if ! git diff --quiet 2>/dev/null || ! git diff --cached --quiet 2>/dev/null; then
  GIT_DIRTY=" (uncommitted changes)"
fi

FAILED=0
FAILED_STEPS=()
printf '\n%s\n' "────────────────────────────────────────────────────────────"
printf '%s\n' "${BOLD}Pre-release report${RESET}"
printf '%s\n' "${DIM}branch ${GIT_BRANCH} @ ${GIT_COMMIT}${GIT_DIRTY}${RESET}"
printf '\n'

for i in "${!STEP_NAMES[@]}"; do
  if [ "${STEP_STATUS[$i]}" = "PASS" ]; then
    printf '  %s✔ PASS%s  %-16s %4ss\n' "$GREEN" "$RESET" "${STEP_NAMES[$i]}" "${STEP_SECONDS[$i]}"
  else
    printf '  %s✘ FAIL%s  %-16s %4ss  %s%s%s\n' "$RED" "$RESET" "${STEP_NAMES[$i]}" "${STEP_SECONDS[$i]}" "$DIM" "${STEP_LOGS[$i]}" "$RESET"
    FAILED=1
    FAILED_STEPS+=("${STEP_NAMES[$i]}")
  fi
done

if [ -n "$COVERAGE_SUMMARY" ]; then
  printf '\n  %sCoverage:%s %s\n' "$DIM" "$RESET" "$COVERAGE_SUMMARY"
fi

if [ "$SKIP_MAESTRO" -eq 1 ]; then
  printf '\n  %sMaestro suite skipped (--skip-maestro).%s\n' "$YELLOW" "$RESET"
fi

printf '\n%s\n' "────────────────────────────────────────────────────────────"
if [ "$FAILED" -eq 0 ]; then
  printf '%sAll checks passed — healthy for release.%s\n\n' "$GREEN" "$RESET"
  exit 0
else
  printf '%s%d check(s) failed: %s%s\n' "$RED" "${#FAILED_STEPS[@]}" "${FAILED_STEPS[*]}" "$RESET"
  printf 'Full logs: %s\n\n' "$LOG_DIR"
  exit 1
fi
