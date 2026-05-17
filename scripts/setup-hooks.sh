#!/usr/bin/env bash
# setup-hooks.sh — Install git hooks for local development.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

mkdir -p "$HOOKS_DIR"

cat > "$HOOKS_DIR/pre-commit" << 'EOF'
#!/usr/bin/env bash
exec bash scripts/pre-commit.sh
EOF
chmod +x "$HOOKS_DIR/pre-commit"

cat > "$HOOKS_DIR/pre-push" << 'EOF'
#!/usr/bin/env bash
exec bash scripts/pre-push.sh
EOF
chmod +x "$HOOKS_DIR/pre-push"

echo "✓ Git hooks installed (pre-commit: lint-fix + lint, pre-push: build + test)"
