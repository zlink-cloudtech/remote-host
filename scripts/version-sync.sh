#!/usr/bin/env bash
# version-sync.sh — Propagate the root VERSION file to all package manifests.
# Does NOT commit. Called by version-bump.sh or run manually.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$REPO_ROOT/VERSION"

[[ -f "$VERSION_FILE" ]] || { echo "ERROR: $VERSION_FILE not found" >&2; exit 1; }

version=$(tr -d '[:space:]' < "$VERSION_FILE")
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-preview\.[0-9]+)?$ ]] || {
  echo "ERROR: VERSION '$version' is not valid semver" >&2; exit 1
}

# Sync JSON package files
for pkg in cli/package.json; do
  [[ -f "$REPO_ROOT/$pkg" ]] || continue
  node -e "
    const fs = require('fs');
    const f = '$REPO_ROOT/$pkg';
    const p = JSON.parse(fs.readFileSync(f, 'utf8'));
    p.version = '$version';
    fs.writeFileSync(f, JSON.stringify(p, null, 2) + '\n');
  "
done

# Sync backend if present
if [[ -f "$REPO_ROOT/backend/package.json" ]]; then
  node -e "
    const fs = require('fs');
    const f = '$REPO_ROOT/backend/package.json';
    const p = JSON.parse(fs.readFileSync(f, 'utf8'));
    p.version = '$version';
    fs.writeFileSync(f, JSON.stringify(p, null, 2) + '\n');
  "
fi

# Sync CLI source program.version() if present
CLI_INDEX="$REPO_ROOT/cli/src/index.ts"
if [[ -f "$CLI_INDEX" ]]; then
  sed -Ei "s/\.version\(\"[0-9]+\.[0-9]+\.[0-9]+(-preview\.[0-9]+)?\"\)/.version(\"$version\")/" "$CLI_INDEX"
fi

# Sync skill metadata if present
SKILL_JSON="$REPO_ROOT/skills/remote-host/skill.json"
if [[ -f "$SKILL_JSON" ]]; then
  node -e "
    const fs = require('fs');
    const f = '$SKILL_JSON';
    const p = JSON.parse(fs.readFileSync(f, 'utf8'));
    p.version = '$version';
    fs.writeFileSync(f, JSON.stringify(p, null, 2) + '\n');
  "
fi

echo "Synced all manifests → $version" >&2
