#!/usr/bin/env bash
# version-bump.sh — Bump VERSION, sync manifests, commit + tag + push.
#
# Usage:
#   scripts/version-bump.sh [patch|minor|major|<version>] [--push-ref <branch>] [--no-commit]
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$REPO_ROOT/VERSION"

BUMP_TYPE="patch"
EXPLICIT_VERSION=""
PUSH_REF="main"
NO_COMMIT=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    patch|minor|major) BUMP_TYPE="$1"; shift ;;
    --push-ref)  PUSH_REF="${2:?--push-ref requires a value}"; shift 2 ;;
    --no-commit) NO_COMMIT=true; shift ;;
    *)
      if [[ "$1" =~ ^v?([0-9]+\.[0-9]+\.[0-9]+)$ ]]; then
        EXPLICIT_VERSION="${BASH_REMATCH[1]}"; shift
      else
        echo "Unknown option: $1" >&2; exit 1
      fi ;;
  esac
done

[[ -f "$VERSION_FILE" ]] || { echo "ERROR: $VERSION_FILE not found" >&2; exit 1; }

current=$(tr -d '[:space:]' < "$VERSION_FILE")
IFS='.' read -r major minor patch <<< "$current"

if [[ -n "$EXPLICIT_VERSION" ]]; then
  new_version="$EXPLICIT_VERSION"
else
  case "$BUMP_TYPE" in
    patch) new_version="$major.$minor.$((patch + 1))" ;;
    minor) new_version="$major.$((minor + 1)).0" ;;
    major) new_version="$((major + 1)).0.0" ;;
  esac
fi

echo "$new_version" > "$VERSION_FILE"
bash "$REPO_ROOT/scripts/version-sync.sh"

if $NO_COMMIT; then
  echo "$new_version"
  exit 0
fi

git add -A
git commit -m "chore: release $new_version [skip ci]"
git tag -a "v$new_version" -m "v$new_version"
git push origin "HEAD:$PUSH_REF" --follow-tags

echo "Released v$new_version"
