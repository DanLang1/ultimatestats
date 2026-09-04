#!/usr/bin/env bash
set -euo pipefail

ROOT="${1:-.}"

if command -v rg >/dev/null 2>&1; then
  echo "=== useEffect callsites ==="
  rg -n '\buseEffect\s*\(' "$ROOT" \
    --glob '*.ts' \
    --glob '*.tsx' \
    --glob '!node_modules/**' \
    --glob '!.expo/**' \
    --glob '!scripts/oxlint-plugin/__tests__/**' \
    --glob '!dist/**' || true
  echo
  echo "=== Files importing useEffect ==="
  rg -n 'import\s+\{[^}]*\buseEffect\b[^}]*\}\s+from\s+['"'"'"]react['"'"'"]' "$ROOT" \
    --glob '*.ts' \
    --glob '*.tsx' \
    --glob '!node_modules/**' \
    --glob '!.expo/**' \
    --glob '!scripts/oxlint-plugin/__tests__/**' \
    --glob '!dist/**' || true
else
  echo "ripgrep (rg) not found; falling back to find and grep."
  echo "=== useEffect callsites ==="
  find "$ROOT" \
    -type f \
    \( -name '*.ts' -o -name '*.tsx' \) \
    -not -path '*/node_modules/*' \
    -not -path '*/.expo/*' \
    -not -path '*/scripts/oxlint-plugin/__tests__/*' \
    -not -path '*/dist/*' \
    -exec grep -EnH '(^|[^[:alnum:]_])useEffect[[:space:]]*\(' {} + || true
  echo
  echo "=== Files importing useEffect ==="
  find "$ROOT" \
    -type f \
    \( -name '*.ts' -o -name '*.tsx' \) \
    -not -path '*/node_modules/*' \
    -not -path '*/.expo/*' \
    -not -path '*/scripts/oxlint-plugin/__tests__/*' \
    -not -path '*/dist/*' \
    -exec grep -EnH 'import[[:space:]]+\{[^}]*useEffect[^}]*\}[[:space:]]+from[[:space:]]+['"'"'"]react['"'"'"]' {} + || true
fi
