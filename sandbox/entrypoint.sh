#!/usr/bin/env bash

# ── Bash profile ──────────────────────────────────────────────────────────────
cat > ~/.bashrc << 'RCEOF'
source /usr/share/bash-completion/bash_completion 2>/dev/null || true
source <(remote-host completion bash 2>/dev/null) || true
export PS1='\[\e[32m\][sandbox]\[\e[0m\] \w \$ '
RCEOF

# ── Welcome banner ────────────────────────────────────────────────────────────
VERSION=$(remote-host --version 2>/dev/null || echo "unknown")

cat <<EOF

=== remote-host sandbox (${SANDBOX_MODE:-docker}) ===
  version  : ${VERSION}
  ssh      : $(ssh -V 2>&1 | head -1 || echo "not found")
  sshpass  : $(sshpass -V 2>&1 | head -1 || echo "not found")
  workdir  : /workspace

  remote-host device list           list configured devices
  remote-host device add            add a device (interactive)
  remote-host ssh <device>          open SSH session
  remote-host upload <device> ...   upload file via scp
  remote-host download <device> ... download file via scp
  remote-host --help                show help

EOF

exec bash --rcfile ~/.bashrc -i
