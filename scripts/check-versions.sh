#!/usr/bin/env bash
# check-versions.sh — Verify all package manifests match the root VERSION file.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$REPO_ROOT/VERSION"
SEMVER_RE='^[0-9]+\.[0-9]+\.[0-9]+(-preview\.[0-9]+)?$'

[[ -f "$VERSION_FILE" ]] || { echo "✗ VERSION file not found" >&2; exit 1; }

source_version=$(tr -d '[:space:]' < "$VERSION_FILE")
[[ "$source_version" =~ $SEMVER_RE ]] || { echo "✗ Invalid semver: $source_version" >&2; exit 1; }

echo "── Source: $source_version ──"

errors=0

check() {
  local label="$1" value="$2"
  if [[ "$value" == "$source_version" ]]; then
    echo "✓ $label: $value"
  else
    echo "✗ $label: $value (expected $source_version)" >&2
    ((errors++))
  fi
}

read_json_version() {
  node -p "JSON.parse(require('fs').readFileSync('$1','utf8')).version"
}

# Check CLI
if [[ -f "$REPO_ROOT/cli/package.json" ]]; then
  check "cli/package.json" "$(read_json_version "$REPO_ROOT/cli/package.json")"
fi

# Check backend
if [[ -f "$REPO_ROOT/backend/package.json" ]]; then
  check "backend/package.json" "$(read_json_version "$REPO_ROOT/backend/package.json")"
fi

# Check skill metadata
if [[ -f "$REPO_ROOT/skills/remote-host/skill.json" ]]; then
  check "skills/remote-host/skill.json" "$(read_json_version "$REPO_ROOT/skills/remote-host/skill.json")"
fi

echo ""
if [[ $errors -gt 0 ]]; then
  echo "✗ $errors version mismatch(es) found" >&2
  exit 1
else
  echo "✓ All versions consistent"
fi
