# AGENTS.md — remote-host

Technical reference for AI agents working on this repository.

---

## Project Overview

| Package | Name                           | Description |
| ------- | ------------------------------ | ----------- |
| `cli/`  | `@zlink-cloudtech/remote-host` | CLI tool    |

---

## Technology Stack

| Category            | Choice            | Version                 |
| ------------------- | ----------------- | ----------------------- |
| Language            | TypeScript        | 5.x                     |
| Runtime             | Node.js           | ≥20.0.0                 |
| Package manager     | pnpm              | ≥9.0.0 (workspace mode) |
| CLI framework       | Commander.js      | ^12                     |
| Interactive prompts | @inquirer/prompts | ^7.5                    |
| Terminal color      | chalk             | ^5 (ESM)                |
| Test framework      | Vitest            | ^1.6                    |

---

## Repository Structure

```
remote-host/
├── VERSION               # Single source of truth for version
├── tsconfig.base.json    # Shared TS config (ES2022, NodeNext, strict)
├── eslint.config.mjs     # ESLint flat config
├── pnpm-workspace.yaml   # Workspace definition
├── package.json          # Root scripts (build, test, lint)
├── scripts/              # version-bump.sh, version-sync.sh, check-versions.sh, pre-commit.sh
├── docs/
│   ├── quickstart.md             # Install + 5-min walkthrough
│   ├── configuration.md          # Env vars, config file, priority
│   └── dev.md                    # Build, test, contribute
├── cli/
│   ├── bin/remote-host.js       # Shebang + dynamic import
│   ├── scripts/postinstall.js
│   ├── remotehostrc.default.json
│   └── src/
│       ├── index.ts              # Commander root + command registration
│       ├── commands/             # One file per subcommand
│       ├── lib/                  # Shared utils (no Commander deps)
│       └── types/                # Type definitions + parsers
└── tests/
    ├── vitest.config.ts
    ├── helpers/
    └── integration/
```

---

## Key Conventions

### Config Priority

```
REMOTE_HOST_TOKEN   env var  >  ~/.remotehostrc.json token  >  ""
```

`~/.remotehostrc.json` is written with mode `600`. The `env` field in `~/.remotehostrc.json` injects environment variables at startup without overriding existing ones.

### Device Storage

Devices are stored in `~/.remote-ssh/devices.yaml` (mode `600`), **separate** from the CLI config file. The storage path can be overridden via `REMOTE_SSH_DEVICES_DIR` env var (used in tests).

```yaml
# ~/.remote-ssh/devices.yaml
devices:
  - id: <8-char hex>   # auto-generated SHA-256 slice
    name: my-pi
    host: 192.168.1.10
    port: 22
    username: pi
    password: secret    # optional; masked in output
    keyFile: ~/.ssh/id_rsa  # optional alternative to password
```

Devices can be referenced by `id` or `name` in all commands.

### Error Handling

- Use `process.exitCode = 1` + return — never `process.exit()`
- Catch `ExitPromptError` from `@inquirer/prompts` → exit code 0 (Ctrl+C is not an error)
- Batch operations: collect results, print summary, set exitCode if any failed

---

## CLI Commands

| Command                                          | Description                                         |
| ------------------------------------------------ | --------------------------------------------------- |
| `remote-host device list [--show-password]`      | List all configured devices                         |
| `remote-host device add [options]`               | Add a device (interactive if options omitted)       |
| `remote-host device remove <id-or-name>`         | Remove a device by id or name                       |
| `remote-host device update <id-or-name> [opts]`  | Update device fields                                |
| `remote-host ssh <device>`                       | Open an interactive SSH session to a named device   |
| `remote-host exec -d <device> [cmd...]`          | Run a command on a device via SSH                   |
| `remote-host download <device> <remote> <local>` | Download a file/dir from device via scp             |
| `remote-host upload <device> <local> <remote>`   | Upload a file/dir to device via scp                 |
| `remote-host config set-token <tok>`             | Persist API token to `~/.remotehostrc.json`         |
| `remote-host config show`                        | Show config file location and content               |
| `remote-host completion [bash]`                  | Output bash completion script                       |

`ssh`, `exec`, `download`, and `upload` use `sshpass` automatically when the device has a stored password, otherwise fall back to key-based auth. The `StrictHostKeyChecking=accept-new` SSH option is applied when using `sshpass` to avoid silent failures on first connections.

---

## Sync Rules

> **IMPORTANT — Lint sync rule:** `scripts/pre-commit.sh` runs **all** lint scripts
> defined in the root `package.json`. Whenever a lint script is **added or removed**
> from `package.json` (i.e. any script matching the `lint:*` pattern), the
> `pre-commit.sh` file **must be updated in the same commit** to add or remove the
> corresponding step.
>
> | `package.json` script | `pre-commit.sh` step                   |
> | --------------------- | -------------------------------------- |
> | `pnpm lint`           | TypeScript type-check (`tsc --noEmit`) |
> | `pnpm lint:eslint`    | ESLint code quality check              |
> | `pnpm lint:prettier`  | Prettier format check                  |
> | `pnpm lint:md`        | Markdown lint                          |

> **IMPORTANT — Docs sync rule:** `docs/` contains user-facing and developer-facing
> documentation. Whenever a CLI command, config field, environment variable, or API route
> is **added, removed, or renamed**, the corresponding documentation **must be updated in
> the same commit**:
>
> | Change                              | What to update in `docs/`                                                      |
> | ----------------------------------- | ------------------------------------------------------------------------------ |
> | New/changed CLI command or option   | `quickstart.md` (if basic usage affected), `dev.md` (if dev workflow affected) |
> | New/changed env var or config field | `configuration.md`                                                             |
> | New/changed API route               | `api-reference.md`                                                             |
> | New/changed CI workflow             | `ci-cd.md` (if present)                                                        |

> **IMPORTANT — Shell completion sync rule:** `cli/src/commands/completion.ts` contains
> the embedded bash completion script. Whenever a CLI command or option is **added,
> removed, or renamed**, the completion script **must be updated in the same commit**:
>
> | Change                        | What to update in `completion.ts`                                    |
> | ----------------------------- | -------------------------------------------------------------------- |
> | New top-level command added   | Add to the top-level `compgen -W` word list                          |
> | New subcommand under `device` | Add to the `device` case `compgen -W` word list                      |
> | New option on a command       | Add to the `_filter_used_options` call for that command's case block |
> | Option removed or renamed     | Remove/rename in the corresponding case block                        |
> | Command removed               | Remove its `case` entry                                              |

---

## Integration Tests

| File                                      | Coverage                             |
| ----------------------------------------- | ------------------------------------ |
| `tests/integration/device.test.ts`        | device add / list / remove / update  |
| `tests/integration/list-devices.test.ts`  | `_list-devices` helper               |
| `tests/integration/version-bump.test.ts`  | version bump scripts                 |

Tests override `REMOTE_SSH_DEVICES_DIR` to isolate device storage from `~/.remote-ssh`.

---

## CI/CD & Deployment

| Artifact                        | Description                                                       |
| ------------------------------- | ----------------------------------------------------------------- |
| `.github/workflows/ci.yml`      | lint + test on every push to `main` and every PR targeting `main` |
| `.github/workflows/release.yml` | auto-version bump (`patch`) when CI passes on a `main` push       |
| `.github/workflows/publish.yml` | publish CLI to NPM + create GitHub Release on semver tag push     |

### Git Hooks (local, optional)

Install with `pnpm setup-hooks`.

| Hook         | Checks                                              | Speed |
| ------------ | --------------------------------------------------- | ----- |
| `pre-commit` | tsc + eslint + prettier + markdown + check-versions | ~10s  |

---

## Environment Variables

| Variable            | Package | Default | Description                                      |
| ------------------- | ------- | ------- | ------------------------------------------------ |
| `REMOTE_HOST_TOKEN` | cli     | —       | API auth token; overrides `~/.remotehostrc.json` |

---

## Common Commands

```bash
# Install all workspace dependencies
pnpm install

# Build all packages
pnpm build

# Run integration tests
pnpm test

# Type-check without emitting
pnpm lint

# Run CLI from source
cd cli && npx tsx src/index.ts <command>
```

---

## Document Sync

<!-- AGENTS_MD_COMMIT: initial -->

This document was initialized at project scaffold time.

To update this document after code changes, run:

```bash
# Review what changed since the last sync point
git --no-pager log --oneline <AGENTS_MD_COMMIT>..HEAD

# After updating AGENTS.md, record the new HEAD commit:
# Edit the AGENTS_MD_COMMIT marker above with the new commit SHA.
```

When contributing significant changes (new commands, env vars, structural changes),
update the relevant sections in this file and bump the `AGENTS_MD_COMMIT` marker.
