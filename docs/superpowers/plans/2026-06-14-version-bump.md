# Version Bump Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a root `pnpm version:bump` command that bumps stable or preview
versions by patch, minor, or major, syncs managed manifests, and prints only
the resulting version.

**Architecture:** Keep the new behavior in a dedicated shell script at
`scripts/version-bump.sh`, mirroring the existing version tooling pattern.
Cover the script with an integration-style Vitest file that builds a temporary
fixture repository, runs the real shell scripts inside that fixture, and
asserts version propagation plus error behavior.

**Tech Stack:** Bash, Node.js 20, pnpm, Vitest, TypeScript

---

## Task 1: Add failing integration coverage for version bump behavior

**Files:**

- Create: `tests/integration/version-bump.test.ts`
- Modify: none
- Test: `tests/integration/version-bump.test.ts`

- [ ] **Step 1: Write the failing test file**

```ts
import { afterEach, describe, expect, it } from "vitest";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";

const repoRoot = join(import.meta.dirname, "..", "..");
const tempRoots: string[] = [];

function createFixture(version: string) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "remote-host-version-bump-"));
  tempRoots.push(fixtureRoot);

  cpSync(join(repoRoot, "scripts"), join(fixtureRoot, "scripts"), { recursive: true });
  mkdirSync(join(fixtureRoot, "cli", "src"), { recursive: true });
  mkdirSync(join(fixtureRoot, "skills", "remote-host"), { recursive: true });

  writeFileSync(join(fixtureRoot, "VERSION"), `${version}\n`);

  cpSync(join(repoRoot, "package.json"), join(fixtureRoot, "package.json"));

  writeFileSync(
    join(fixtureRoot, "cli", "package.json"),
    JSON.stringify({ name: "@zlink-cloudtech/remote-host", version, type: "module" }, null, 2) + "\n",
    { encoding: "utf8", flag: "w" },
  );

  writeFileSync(
    join(fixtureRoot, "cli", "src", "index.ts"),
    [
      'import { Command } from "commander";',
      'const program = new Command();',
      `program.version("${version}");`,
      "",
    ].join("\n"),
    { encoding: "utf8", flag: "w" },
  );

  writeFileSync(
    join(fixtureRoot, "skills", "remote-host", "skill.json"),
    JSON.stringify({ name: "remote-host", version }, null, 2) + "\n",
    { encoding: "utf8", flag: "w" },
  );

  return fixtureRoot;
}

function runVersionBump(fixtureRoot: string, args: string[] = []) {
  return spawnSync("bash", [join(fixtureRoot, "scripts", "version-bump.sh"), ...args], {
    cwd: fixtureRoot,
    encoding: "utf8",
  });
}

function readVersionFile(fixtureRoot: string, relativePath: string) {
  return readFileSync(join(fixtureRoot, relativePath), "utf8").trim();
}

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe("version:bump script", () => {
  it("bumps patch by default and syncs managed files", () => {
    const fixtureRoot = createFixture("1.2.3");
    const result = runVersionBump(fixtureRoot);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("1.2.4");
    expect(result.stderr).toContain("Synced all manifests → 1.2.4");
    expect(readVersionFile(fixtureRoot, "VERSION")).toBe("1.2.4");
    expect(JSON.parse(readVersionFile(fixtureRoot, "cli/package.json")).version).toBe("1.2.4");
    expect(JSON.parse(readVersionFile(fixtureRoot, "skills/remote-host/skill.json")).version).toBe("1.2.4");
    expect(readVersionFile(fixtureRoot, "cli/src/index.ts")).toContain('program.version("1.2.4")');
  });

  it("bumps minor and resets patch", () => {
    const fixtureRoot = createFixture("1.2.3");
    const result = runVersionBump(fixtureRoot, ["--minor"]);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("1.3.0");
    expect(readVersionFile(fixtureRoot, "VERSION")).toBe("1.3.0");
  });

  it("bumps major and resets minor and patch", () => {
    const fixtureRoot = createFixture("1.2.3");
    const result = runVersionBump(fixtureRoot, ["--major"]);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("2.0.0");
    expect(readVersionFile(fixtureRoot, "VERSION")).toBe("2.0.0");
  });

  it("normalizes preview versions before bumping", () => {
    const fixtureRoot = createFixture("1.2.3-preview.4");
    const result = runVersionBump(fixtureRoot, ["--minor"]);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("1.3.0");
    expect(readVersionFile(fixtureRoot, "VERSION")).toBe("1.3.0");
  });

  it("fails when more than one bump flag is provided", () => {
    const fixtureRoot = createFixture("1.2.3");
    const result = runVersionBump(fixtureRoot, ["--minor", "--major"]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("bump level flag");
    expect(readVersionFile(fixtureRoot, "VERSION")).toBe("1.2.3");
  });

  it("fails on unsupported arguments", () => {
    const fixtureRoot = createFixture("1.2.3");
    const result = runVersionBump(fixtureRoot, ["--patch"]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Unsupported argument");
  });

  it("fails on invalid version input", () => {
    const fixtureRoot = createFixture("1.2.invalid");
    const result = runVersionBump(fixtureRoot);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("not valid semver");
  });
});
```

- [ ] **Step 2: Run the new test file to verify it fails**

Run: `cd tests && pnpm test -- integration/version-bump.test.ts`
Expected: FAIL because `scripts/version-bump.sh` does not exist yet.

## Task 2: Implement the new version bump script and wire it into package scripts

**Files:**

- Create: `scripts/version-bump.sh`
- Modify: `package.json`
- Test: `tests/integration/version-bump.test.ts`

- [ ] **Step 1: Add the root script entry**

```json
{
  "scripts": {
    "version:bump": "bash scripts/version-bump.sh"
  }
}
```

- [ ] **Step 2: Implement the new shell script**

```bash
#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION_FILE="$REPO_ROOT/VERSION"
SEMVER_RE='^([0-9]+)\.([0-9]+)\.([0-9]+)(-preview\.([0-9]+))?$'

[[ -f "$VERSION_FILE" ]] || { echo "ERROR: $VERSION_FILE not found" >&2; exit 1; }

bump_level="patch"

for arg in "$@"; do
  case "$arg" in
    --minor)
      [[ "$bump_level" == "patch" ]] || { echo "ERROR: Only one bump level flag may be set" >&2; exit 1; }
      bump_level="minor"
      ;;
    --major)
      [[ "$bump_level" == "patch" ]] || { echo "ERROR: Only one bump level flag may be set" >&2; exit 1; }
      bump_level="major"
      ;;
    *)
      echo "ERROR: Unsupported argument '$arg'" >&2
      exit 1
      ;;
  esac
done

current="$(tr -d '[:space:]' < "$VERSION_FILE")"
[[ "$current" =~ $SEMVER_RE ]] || { echo "ERROR: VERSION '$current' is not valid semver" >&2; exit 1; }

major="${BASH_REMATCH[1]}"
minor="${BASH_REMATCH[2]}"
patch="${BASH_REMATCH[3]}"

case "$bump_level" in
  patch)
    patch=$((patch + 1))
    ;;
  minor)
    minor=$((minor + 1))
    patch=0
    ;;
  major)
    major=$((major + 1))
    minor=0
    patch=0
    ;;
  *)
    echo "ERROR: Unsupported bump level '$bump_level'" >&2
    exit 1
    ;;
esac

next_version="$major.$minor.$patch"
echo "$next_version" > "$VERSION_FILE"
bash "$REPO_ROOT/scripts/version-sync.sh"
printf '%s\n' "$next_version"
```

- [ ] **Step 3: Run the focused tests to verify they pass**

Run: `cd tests && pnpm test -- integration/version-bump.test.ts`
Expected: PASS for all version bump cases.

## Task 3: Document the new developer workflow and run repo checks

**Files:**

- Modify: `docs/dev.md`
- Test: `docs/dev.md`, `package.json`, `tests/integration/version-bump.test.ts`

- [ ] **Step 1: Add the version bump commands to the development guide**

````md
## Versioning

```bash
# Bump the patch version
pnpm version:bump

# Bump the minor version and reset patch to 0
pnpm version:bump --minor

# Bump the major version and reset minor and patch to 0
pnpm version:bump --major

# Advance the preview suffix on the current base version
pnpm version:preview
```
````

- [ ] **Step 2: Run the narrow validation commands**

Run:

```bash
cd /home/wang_hongqi/Documents/work/zlink-cloudtech/scaffold-aicoding/repos/remote-host && \
  pnpm --filter='./tests' test -- integration/version-bump.test.ts && \
  pnpm version:check && \
  pnpm exec markdownlint-cli2 \
    docs/dev.md \
    docs/2026-06-05-version-bump-design.md
```

Expected: Tests pass, versions stay in sync, and markdown lint passes.
