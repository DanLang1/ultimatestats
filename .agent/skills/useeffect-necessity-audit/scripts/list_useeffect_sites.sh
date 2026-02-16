#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

if command -v rg >/dev/null 2>&1; then
  echo "=== useEffect callsites ==="
  rg -n "\\buseEffect\\s*\\(" "$ROOT" --glob "*.ts" --glob "*.tsx" || true
  echo
  echo "=== Files importing useEffect ==="
  rg -n "import\\s+\\{[^}]*\\buseEffect\\b[^}]*\\}\\s+from\\s+['\\\"]react['\\\"]" \
    "$ROOT" --glob "*.ts" --glob "*.tsx" || true
else
  echo "ripgrep (rg) not found; falling back to grep."
  echo "=== useEffect callsites ==="
  grep -RIn --include='*.ts' --include='*.tsx' "\\buseEffect\\s*(" "$ROOT" || true
  echo
  echo "=== Files importing useEffect ==="
  grep -RIn --include='*.ts' --include='*.tsx' \
    "import .*useEffect.* from ['\\\"]react['\\\"]" "$ROOT" || true
fi
