#!/usr/bin/env bash
# version-preview.sh — Advance VERSION to the next preview release, sync manifests, commit locally.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$REPO_ROOT/VERSION"

[[ -f "$VERSION_FILE" ]] || { echo "ERROR: $VERSION_FILE not found" >&2; exit 1; }

current=$(tr -d '[:space:]' < "$VERSION_FILE")
[[ "$current" =~ ^([0-9]+\.[0-9]+\.[0-9]+)(-preview\.([0-9]+))?$ ]] || {
  echo "ERROR: VERSION '$current' is not valid semver" >&2; exit 1
}

base_version="${BASH_REMATCH[1]}"
preview_number="${BASH_REMATCH[3]:-0}"
new_version="$base_version-preview.$((preview_number + 1))"

echo "$new_version" > "$VERSION_FILE"
bash "$REPO_ROOT/scripts/version-sync.sh"

git add -A
git commit -m "chore: preview version $new_version [skip ci]"

echo "$new_version"
