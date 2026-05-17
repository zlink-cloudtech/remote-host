#!/usr/bin/env bash
# pre-push.sh — Build and test gate before push.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "▶ [1/2] Build..."
pnpm build
echo ""

echo "▶ [2/2] Tests..."
pnpm test
echo ""

echo "✓ All pre-push checks passed"
