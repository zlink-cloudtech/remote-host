#!/usr/bin/env bash
# pre-commit.sh — Auto-fix lint issues, then verify all lint checks pass.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.."\ && pwd)"
cd "$REPO_ROOT"

echo "▶ [1/3] Lint fix (eslint --fix + prettier --write)..."
pnpm lint:fix
echo ""

echo "▶ [2/3] Lint checks (tsc + eslint + prettier + markdownlint)..."
pnpm lint:all
echo ""

echo "▶ [3/3] Version consistency..."
bash scripts/check-versions.sh
echo ""

echo "✓ All pre-commit checks passed"
