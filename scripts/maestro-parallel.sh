#!/usr/bin/env bash
#
# Run the Maestro suite sharded across several booted iOS simulators.
#
# Flows are split evenly (--shard-split) across the first N booted simulators
# whose name matches MAESTRO_DEVICE_MODEL exactly, so every shard sees the same
# screen size. Other booted simulators (e.g. an iPad) are ignored.
#
# Each simulator must already be booted with the dev client installed and
# connected to Metro.
#
# Usage:
#   npm run maestro:parallel                     # 3 shards, all flows
#   npm run maestro:parallel -- --include-tags basic
#   MAESTRO_SHARDS=2 npm run maestro:parallel
#   bash scripts/maestro-parallel.sh --dry-run   # print the command only
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

SHARDS="${MAESTRO_SHARDS:-3}"
DEVICE_MODEL="${MAESTRO_DEVICE_MODEL:-iPhone 17 Pro}"

DRY_RUN=0
MAESTRO_ARGS=()
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    *) MAESTRO_ARGS+=("$arg") ;;
  esac
done

BOOTED_UDIDS=()
while IFS= read -r udid; do
  BOOTED_UDIDS+=("$udid")
done < <(
  xcrun simctl list devices booted |
    sed -nE "s/^ +${DEVICE_MODEL} \(([0-9A-F-]{36})\) \(Booted\).*/\1/p"
)

if ((${#BOOTED_UDIDS[@]} < SHARDS)); then
  echo "Need $SHARDS booted '$DEVICE_MODEL' simulators; found ${#BOOTED_UDIDS[@]}." >&2
  echo "Available '$DEVICE_MODEL' simulators:" >&2
  xcrun simctl list devices available | grep -E "^ +${DEVICE_MODEL} \(" >&2 || true
  echo "Boot one with: xcrun simctl boot <UDID>, then install and open the dev client on it." >&2
  exit 1
fi

DEVICES="$(IFS=,; echo "${BOOTED_UDIDS[*]:0:SHARDS}")"

CMD=(maestro test --shard-split "$SHARDS" --device "$DEVICES")
if ((${#MAESTRO_ARGS[@]})); then
  CMD+=("${MAESTRO_ARGS[@]}")
fi
CMD+=(.maestro/tests/)

if ((DRY_RUN)); then
  printf '%q ' MAESTRO_CLI_NO_ANALYTICS=1 "${CMD[@]}"
  echo
  exit 0
fi

MAESTRO_CLI_NO_ANALYTICS=1 "${CMD[@]}"
