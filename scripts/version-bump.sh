#!/usr/bin/env bash
# version-bump.sh — Bump VERSION, sync manifests, and print the new version.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$REPO_ROOT/VERSION"
SEMVER_RE='^([0-9]+)\.([0-9]+)\.([0-9]+)(-preview\.([0-9]+))?$'

[[ -f "$VERSION_FILE" ]] || { echo "ERROR: $VERSION_FILE not found" >&2; exit 1; }

bump_level="patch"
selected_flag=""

for arg in "$@"; do
  case "$arg" in
    --minor|--major)
      [[ -z "$selected_flag" ]] || {
        echo "ERROR: Only one bump level flag may be set" >&2
        exit 1
      }
      selected_flag="$arg"
      bump_level="${arg#--}"
      ;;
    *)
      echo "ERROR: Unsupported argument '$arg'" >&2
      exit 1
      ;;
  esac
done

current="$(tr -d '[:space:]' < "$VERSION_FILE")"
if [[ "$current" =~ $SEMVER_RE ]]; then
  major_part="${BASH_REMATCH[1]}"
  minor_part="${BASH_REMATCH[2]}"
  patch_part="${BASH_REMATCH[3]}"
else
  echo "ERROR: VERSION '$current' is not valid semver" >&2
  exit 1
fi

case "$bump_level" in
  patch)
    patch_part=$((patch_part + 1))
    ;;
  minor)
    minor_part=$((minor_part + 1))
    patch_part=0
    ;;
  major)
    major_part=$((major_part + 1))
    minor_part=0
    patch_part=0
    ;;
  *)
    echo "ERROR: Unsupported bump level '$bump_level'" >&2
    exit 1
    ;;
esac

new_version="$major_part.$minor_part.$patch_part"
printf '%s\n' "$new_version" > "$VERSION_FILE"
bash "$REPO_ROOT/scripts/version-sync.sh"
printf '%s\n' "$new_version"
