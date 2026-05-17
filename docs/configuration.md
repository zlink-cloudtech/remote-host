# Configuration Reference — remote-host

**Status**: Stable | **Last Updated**: 2026-05-13

---

## Overview

Configuration is resolved in priority order: **environment variables > config file > defaults**.

## Environment Variables

| Variable            | Default | Description                       |
| ------------------- | ------- | --------------------------------- |
| `REMOTE_HOST_TOKEN` | —       | Auth token; overrides config file |

## Config File (`~/.remotehostrc.json`)

Location: `~/.remotehostrc.json` (created automatically on first install, mode `600`).

Managed via CLI:

```bash
remote-host config set-token <token>
remote-host config show
```

| Field   | Type   | Description |
| ------- | ------ | ----------- |
| `token` | string | Auth token  |

## Priority

```
Environment variable  →  ~/.remotehostrc.json  →  built-in default
```

Environment variables always win. The config file is the recommended way to persist settings.
