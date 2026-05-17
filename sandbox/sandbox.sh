#!/usr/bin/env bash
# sandbox.sh — Build and run remote-host inside a Docker container for E2E testing.
#
# Usage:
#   bash sandbox/sandbox.sh            # full build + enter container
#   bash sandbox/sandbox.sh --no-build # skip pnpm build, reuse existing dist/
#   bash sandbox/sandbox.sh --cn       # use China mirrors (Debian apt + npm)
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

NO_BUILD=false
CN=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-build) NO_BUILD=true; shift ;;
    --cn) CN=true; shift ;;
    -h|--help)
      echo "Usage: bash sandbox/sandbox.sh [--no-build] [--cn]"
      exit 0 ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

# ── Phase 1: Build CLI ────────────────────────────────────────────────────────
if ! $NO_BUILD; then
  echo "▶ Phase 1/5: Building CLI..."
  pnpm --filter='./cli' build
else
  echo "▶ Phase 1/5: Skipping build (--no-build)"
fi

# ── Phase 2: Pack CLI tgz ─────────────────────────────────────────────────────
echo "▶ Phase 2/5: Packing CLI..."
TGZ_NAME="$(cd cli && npm pack --pack-destination /tmp 2>/dev/null | tail -1 | tr -d '\r')"
TGZ_PATH="/tmp/$TGZ_NAME"

# ── Phase 3: Compute content-hash image tag ───────────────────────────────────
echo "▶ Phase 3/5: Computing image tag..."
TGZ_HASH=$(sha256sum "$TGZ_PATH" | awk '{print $1}' | head -c 12)
$CN && IMAGE_TAG="remote-host-sandbox:${TGZ_HASH}-cn" || IMAGE_TAG="remote-host-sandbox:${TGZ_HASH}"

# placeholder stubs required by Dockerfile COPY (always present even if empty)
touch sandbox/__kubectl_local sandbox/__helm_local

# ── Phase 4: Docker build (cache-aware) ──────────────────────────────────────
if docker image inspect "$IMAGE_TAG" > /dev/null 2>&1; then
  echo "▶ Phase 4/5: Docker image up-to-date — skipping build."
else
  echo "▶ Phase 4/5: Building Docker image $IMAGE_TAG ..."
  cp "$TGZ_PATH" "sandbox/$TGZ_NAME"
  BUILD_ARGS=(--build-arg "TGZ_NAME=$TGZ_NAME")
  $CN && BUILD_ARGS+=(--build-arg "CN=1")
  docker build "${BUILD_ARGS[@]}" -f sandbox/Dockerfile -t "$IMAGE_TAG" sandbox/
  rm -f "sandbox/$TGZ_NAME"
fi
rm -f "$TGZ_PATH"

# Prune old sandbox images (keep latest 3)
mapfile -t OLD_IMAGES < <(
  docker images --format '{{.Repository}}:{{.Tag}} {{.CreatedAt}}' \
    | grep '^remote-host-sandbox:' | grep -v "^${IMAGE_TAG} " \
    | sort -k2 -r | tail -n +4 | awk '{print $1}'
)
[[ ${#OLD_IMAGES[@]} -gt 0 ]] && docker rmi "${OLD_IMAGES[@]}" > /dev/null 2>&1 || true

# ── Phase 5: Run container ────────────────────────────────────────────────────
echo "▶ Phase 5/5: Entering sandbox..."
docker run --rm -it \
  -v "$REPO_ROOT:/workspace" \
  -e "SANDBOX_MODE=docker" \
  "$IMAGE_TAG"
