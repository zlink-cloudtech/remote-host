# Design: Device Name Auto-Completion for `remote-host` CLI

**Date:** 2026-06-14  
**Status:** Approved  
**Scope:** `repos/remote-host/`

---

## Problem

The bash completion script in `completion.ts` only completes device names for `ssh` and `exec -d`.  
`upload`, `download`, `device remove`, and `device update` all accept a device name argument but offer no completion — users must type device names from memory.

Additionally, the existing `ssh` and `exec` device completion uses inline `grep/sed` to parse `~/.remote-ssh/devices.yaml`, which couples the completion script to the YAML format.

---

## Goal

Every position that accepts a device name/id in the `remote-host` CLI completes from the live device list.

| Command | Device arg position | Before | After |
|---|---|---|---|
| `ssh <device>` | pos 2 | grep/sed | `_list-devices` |
| `exec -d <device>` | after `-d`/`--device` | grep/sed | `_list-devices` |
| `upload <device> ...` | pos 2 | ❌ none | `_list-devices` |
| `download <device> ...` | pos 2 | ❌ none | `_list-devices` |
| `device remove <name>` | pos 3 | ❌ none | `_list-devices` |
| `device update <name>` | pos 3 | ❌ none | `_list-devices` |

---

## Architecture

### Component 1 — `_list-devices` command

**File:** `cli/src/commands/_list-devices.ts`  
**Export:** `registerListDevices(program: Command): void`

Behaviour:
- Calls `readDevices()` from `lib/devices.ts`
- Writes each device's `name` to stdout, one per line
- Exits 0 with empty output when no devices exist
- Hidden from `--help` (Commander `.command('_list-devices').hideHelp()`)
- Registered in `index.ts` alongside all other commands

The `_` prefix is a convention signal that this is an internal plumbing command, not user-facing.

### Component 2 — Updated bash completion script in `completion.ts`

**Helper added at the top of the function:**

```bash
_remote_host_list_devices() {
  remote-host _list-devices 2>/dev/null
}
```

**Per-command changes:**

| Case | Change |
|---|---|
| `ssh` | Replace `grep/sed` block with `$(_remote_host_list_devices)` |
| `exec` | Replace `grep/sed` block with `$(_remote_host_list_devices)` |
| `upload` | Add: `COMP_CWORD -eq 2` → complete devices |
| `download` | Add: `COMP_CWORD -eq 2` → complete devices |
| `device remove` | Add case: `COMP_CWORD -eq 3` → complete devices |
| `device update` | Split: `COMP_CWORD -eq 3` → complete devices; `COMP_CWORD -ge 4` → complete flags |

### Component 3 — Tests

The handler logic in `_list-devices.ts` is a thin pass-through over `readDevices()`, which has full coverage in `tests/integration/device.test.ts`. No separate test file is added for `_list-devices`.

A new integration test file `tests/integration/list-devices.test.ts` verifies the CLI output format:
- Sets up temp device dir via `REMOTE_SSH_DEVICES_DIR`
- Adds two devices via `addDevice()`
- Invokes `remote-host _list-devices` via `spawnSync` against the built binary
- Asserts stdout contains both device names, one per line

---

## Data Flow

```
TAB pressed after: remote-host ssh <TAB>
  → bash calls _remote_host_completion
  → command == "ssh", COMP_CWORD == 2
  → calls _remote_host_list_devices
    → executes: remote-host _list-devices
      → readDevices() reads ~/.remote-ssh/devices.yaml
      → prints device names to stdout
  → compgen filters names against current input
  → COMPREPLY set
```

---

## Error Handling

- If `~/.remote-ssh/devices.yaml` does not exist, `readDevices()` returns `[]` → empty output → no completion candidates, no error shown to user.
- Stderr from `_list-devices` is suppressed in the helper (`2>/dev/null`) so completion failures are silent.
- If the binary is not on PATH during completion, `compgen` silently produces no results.

---

## Files Changed

```
cli/src/commands/_list-devices.ts   (new)
cli/src/commands/completion.ts      (modified)
cli/src/index.ts                    (modified — register new command)
tests/integration/list-devices.test.ts  (new)
```

---

## Out of Scope

- zsh completion (deferred to a future change)
- Fish, PowerShell completion
- `device add` flag value completion (e.g., suggesting known hosts)
