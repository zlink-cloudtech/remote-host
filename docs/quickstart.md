# Quickstart — remote-host

**Last Updated**: 2026-05-13

---

## Install

```bash
npm install -g @zlink-cloudtech/remote-host
# or:
pnpm add -g @zlink-cloudtech/remote-host
```

Requires Node.js ≥ 20.0.0.

## Basic Usage

```bash
# Show available commands
remote-host --help

# Configure your auth token
remote-host config set-token <your-token>

# Show current configuration
remote-host config show

# Execute a command on a remote device via SSH
remote-host exec -d <device> <command> [args...]
# Example:
remote-host exec -d my-server kubectl get pods
```

## Next Steps

- [Configuration Reference](configuration.md) — env vars, config file, priority rules
- [Development Guide](dev.md) — build, test, contribute
