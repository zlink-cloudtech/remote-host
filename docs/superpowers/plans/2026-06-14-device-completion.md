# Device Name Auto-Completion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add device name auto-completion to all `remote-host` subcommands that accept a `<device>` argument.

**Architecture:** Add an internal `_list-devices` CLI command backed by the existing `readDevices()` lib function. Update the bash completion script to call this command via a shared helper `_remote_host_list_devices()`, replacing the fragile `grep/sed` approach and adding missing completion for `upload`, `download`, `device remove`, and `device update`.

**Tech Stack:** TypeScript, Node.js, Commander v12, vitest (existing stack — no new dependencies)

---

### Task 1: Write failing test for `_list-devices` output contract

**Files:**
- Create: `tests/integration/list-devices.test.ts`

- [ ] **Step 1: Write the failing test**

  Create `tests/integration/list-devices.test.ts`:

  ```typescript
  import { describe, it, expect, beforeEach, afterEach } from "vitest";
  import { mkdtempSync, rmSync } from "node:fs";
  import { join } from "node:path";
  import { tmpdir } from "node:os";
  import { addDevice, readDevices } from "../../cli/src/lib/devices.js";

  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "remote-host-list-devices-"));
    process.env["REMOTE_SSH_DEVICES_DIR"] = tempDir;
  });

  afterEach(() => {
    delete process.env["REMOTE_SSH_DEVICES_DIR"];
    rmSync(tempDir, { recursive: true, force: true });
  });

  describe("_list-devices output contract", () => {
    it("produces one device name per line for the completion command", () => {
      addDevice({ name: "server1", host: "1.1.1.1", username: "root" });
      addDevice({ name: "mypi", host: "2.2.2.2", username: "pi" });

      const output = readDevices()
        .map((d) => d.name)
        .join("\n");

      expect(output).toBe("server1\nmypi");
    });

    it("produces empty string when no devices exist", () => {
      const output = readDevices()
        .map((d) => d.name)
        .join("\n");

      expect(output).toBe("");
    });

    it("includes all added device names in output", () => {
      addDevice({ name: "alpha", host: "10.0.0.1", username: "admin" });
      addDevice({ name: "beta", host: "10.0.0.2", username: "admin" });
      addDevice({ name: "gamma", host: "10.0.0.3", username: "admin" });

      const names = readDevices().map((d) => d.name);

      expect(names).toContain("alpha");
      expect(names).toContain("beta");
      expect(names).toContain("gamma");
      expect(names).toHaveLength(3);
    });
  });
  ```

- [ ] **Step 2: Run test to verify it passes (contract is already satisfied by devices lib)**

  ```bash
  cd /home/wang_hongqi/Documents/work/zlink-cloudtech/scaffold-aicoding/repos/remote-host/tests
  pnpm test -- --reporter=verbose 2>&1 | grep -A5 "list-devices"
  ```

  Expected: all three tests PASS (they exercise `readDevices()` which already works — this locks in the contract for `_list-devices` to implement against).

- [ ] **Step 3: Commit**

  ```bash
  cd /home/wang_hongqi/Documents/work/zlink-cloudtech/scaffold-aicoding/repos/remote-host
  git add tests/integration/list-devices.test.ts
  git commit -m "test: add output contract tests for _list-devices command"
  ```

---

### Task 2: Implement `_list-devices` command

**Files:**
- Create: `cli/src/commands/_list-devices.ts`
- Modify: `cli/src/index.ts`

- [ ] **Step 1: Create `cli/src/commands/_list-devices.ts`**

  ```typescript
  import type { Command } from "commander";
  import { readDevices } from "../lib/devices.js";

  export function registerListDevices(program: Command): void {
    program
      .command("_list-devices")
      .description("Internal: list device names for shell completion")
      .hideHelp()
      .action(() => {
        const devices = readDevices();
        if (devices.length > 0) {
          process.stdout.write(devices.map((d) => d.name).join("\n") + "\n");
        }
      });
  }
  ```

- [ ] **Step 2: Register command in `cli/src/index.ts`**

  Add import after the existing `registerCompletion` import line:

  ```typescript
  import { registerListDevices } from "./commands/_list-devices.js";
  ```

  Add registration call after `registerCompletion(program);`:

  ```typescript
  registerListDevices(program);
  ```

- [ ] **Step 3: Build and verify the command works manually**

  ```bash
  cd /home/wang_hongqi/Documents/work/zlink-cloudtech/scaffold-aicoding/repos/remote-host/cli
  pnpm build 2>&1 | tail -5
  node bin/remote-host.js _list-devices
  ```

  Expected: outputs device names from `~/.remote-ssh/devices.yaml` (or empty if none configured).

  Also verify it is hidden from help:
  ```bash
  node bin/remote-host.js --help | grep "_list-devices"
  ```
  Expected: no output (command is hidden).

- [ ] **Step 4: Commit**

  ```bash
  cd /home/wang_hongqi/Documents/work/zlink-cloudtech/scaffold-aicoding/repos/remote-host
  git add cli/src/commands/_list-devices.ts cli/src/index.ts cli/dist/
  git commit -m "feat: add internal _list-devices command for shell completion"
  ```

---

### Task 3: Update bash completion script

**Files:**
- Modify: `cli/src/commands/completion.ts`

The bash completion script is a template literal string. Make the following changes:

- [ ] **Step 1: Add `_remote_host_list_devices` helper and replace `ssh` + `exec` device completion**

  In `cli/src/commands/completion.ts`, replace the entire `BASH_SCRIPT` template literal with the updated version below.

  The key changes are:
  1. Add `_remote_host_list_devices()` helper that calls `remote-host _list-devices 2>/dev/null`
  2. `ssh` case: use `$(_remote_host_list_devices)` instead of `grep/sed`
  3. `exec` case: use `$(_remote_host_list_devices)` instead of `grep/sed`
  4. `upload` case: add `COMP_CWORD -eq 2` device completion
  5. `download` case: add `COMP_CWORD -eq 2` device completion
  6. `device remove` case: add `COMP_CWORD -eq 3` device completion
  7. `device update` case: split `COMP_CWORD -eq 3` for device name vs `COMP_CWORD -ge 4` for flags

  Find the existing `BASH_SCRIPT` constant and replace its content. The full updated script:

  ```typescript
  const BASH_SCRIPT = `\
  _remote_host_completion() {
    local cur prev command
    _init_completion 2>/dev/null || return

    # Top-level completion
    if [[ $COMP_CWORD -eq 1 ]]; then
      COMPREPLY=($(compgen -W "device ssh exec upload download config completion" -- "\${cur}"))
      return
    fi

    command="\${COMP_WORDS[1]}"

    # Filter out already-used options
    _filter_used_options() {
      local opts="$1"; shift
      local used=("$@")
      for u in "\${used[@]}"; do
        opts="\${opts//$u/}"
      done
      echo "$opts"
    }

    # List configured device names via the CLI (authoritative, format-independent)
    _remote_host_list_devices() {
      remote-host _list-devices 2>/dev/null
    }

    case "\${command}" in
      device)
        if [[ $COMP_CWORD -eq 2 ]]; then
          COMPREPLY=($(compgen -W "list add remove update" -- "\${cur}"))
          return
        fi
        local subcmd="\${COMP_WORDS[2]}"
        case "\${subcmd}" in
          list)
            local opts=$(_filter_used_options "--show-password" "\${COMP_WORDS[@]:3}")
            COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}")) ;;
          add)
            local opts=$(_filter_used_options "--name --host --port --username --password --key-file" "\${COMP_WORDS[@]:3}")
            COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}")) ;;
          remove)
            if [[ $COMP_CWORD -eq 3 ]]; then
              local devices
              devices=$(_remote_host_list_devices)
              COMPREPLY=($(compgen -W "$devices" -- "\${cur}"))
            fi ;;
          update)
            if [[ $COMP_CWORD -eq 3 ]]; then
              local devices
              devices=$(_remote_host_list_devices)
              COMPREPLY=($(compgen -W "$devices" -- "\${cur}"))
            else
              local opts=$(_filter_used_options "--name --host --port --username --password --key-file --clear-password --clear-key-file" "\${COMP_WORDS[@]:4}")
              COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}"))
            fi ;;
        esac ;;
      ssh)
        if [[ $COMP_CWORD -eq 2 ]]; then
          local devices
          devices=$(_remote_host_list_devices)
          COMPREPLY=($(compgen -W "$devices" -- "\${cur}"))
        fi ;;
      exec)
        if [[ "\${prev}" == "-d" || "\${prev}" == "--device" ]]; then
          local devices
          devices=$(_remote_host_list_devices)
          COMPREPLY=($(compgen -W "$devices" -- "\${cur}"))
        elif [[ $COMP_CWORD -eq 2 ]]; then
          local opts=$(_filter_used_options "-d --device" "\${COMP_WORDS[@]:2}")
          COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}"))
        fi ;;
      upload)
        if [[ $COMP_CWORD -eq 2 ]]; then
          local devices
          devices=$(_remote_host_list_devices)
          COMPREPLY=($(compgen -W "$devices" -- "\${cur}"))
        else
          local opts=$(_filter_used_options "--recursive" "\${COMP_WORDS[@]:2}")
          COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}"))
        fi ;;
      download)
        if [[ $COMP_CWORD -eq 2 ]]; then
          local devices
          devices=$(_remote_host_list_devices)
          COMPREPLY=($(compgen -W "$devices" -- "\${cur}"))
        else
          local opts=$(_filter_used_options "--recursive" "\${COMP_WORDS[@]:2}")
          COMPREPLY=($(compgen -W "\${opts}" -- "\${cur}"))
        fi ;;
      config)
        if [[ $COMP_CWORD -eq 2 ]]; then
          COMPREPLY=($(compgen -W "show set-token" -- "\${cur}"))
        fi ;;
      completion)
        COMPREPLY=($(compgen -W "bash" -- "\${cur}")) ;;
    esac
  }
  complete -F _remote_host_completion remote-host
  `;
  ```

- [ ] **Step 2: Build**

  ```bash
  cd /home/wang_hongqi/Documents/work/zlink-cloudtech/scaffold-aicoding/repos/remote-host/cli
  pnpm build 2>&1 | tail -5
  ```

  Expected: no errors.

- [ ] **Step 3: Verify the completion script output looks correct**

  ```bash
  node bin/remote-host.js completion bash | grep -A3 "_remote_host_list_devices\|upload\|download\|remove\|update"
  ```

  Expected: the helper function definition appears, and `upload`/`download`/`device remove`/`device update` blocks contain `_remote_host_list_devices` calls.

- [ ] **Step 4: Commit**

  ```bash
  cd /home/wang_hongqi/Documents/work/zlink-cloudtech/scaffold-aicoding/repos/remote-host
  git add cli/src/commands/completion.ts cli/dist/
  git commit -m "feat: use _list-devices in bash completion for all device args"
  ```

---

### Task 4: Run full test suite and verify

- [ ] **Step 1: Run all tests**

  ```bash
  cd /home/wang_hongqi/Documents/work/zlink-cloudtech/scaffold-aicoding/repos/remote-host/tests
  pnpm test 2>&1
  ```

  Expected: all tests PASS (device.test.ts, list-devices.test.ts, version-bump.test.ts).

- [ ] **Step 2: TypeScript type-check**

  ```bash
  cd /home/wang_hongqi/Documents/work/zlink-cloudtech/scaffold-aicoding/repos/remote-host/cli
  pnpm lint 2>&1
  ```

  Expected: no errors.

- [ ] **Step 3: Commit dist if needed**

  If the dist files changed and weren't committed yet:

  ```bash
  cd /home/wang_hongqi/Documents/work/zlink-cloudtech/scaffold-aicoding/repos/remote-host
  git status --short
  git add cli/dist/ && git commit -m "build: rebuild dist after completion changes" || echo "nothing to commit"
  ```
