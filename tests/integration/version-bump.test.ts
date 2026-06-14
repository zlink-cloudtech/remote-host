import { afterEach, describe, expect, it } from "vitest";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const tempRoots: string[] = [];

function createFixture(version: string) {
  const fixtureRoot = mkdtempSync(join(tmpdir(), "remote-host-version-bump-"));
  tempRoots.push(fixtureRoot);

  cpSync(join(repoRoot, "scripts"), join(fixtureRoot, "scripts"), { recursive: true });
  mkdirSync(join(fixtureRoot, "cli", "src"), { recursive: true });
  mkdirSync(join(fixtureRoot, "skills", "remote-host"), { recursive: true });

  writeFileSync(join(fixtureRoot, "VERSION"), `${version}\n`);
  writeFileSync(
    join(fixtureRoot, "cli", "package.json"),
    JSON.stringify({ name: "@zlink-cloudtech/remote-host", version, type: "module" }, null, 2) + "\n",
  );
  writeFileSync(
    join(fixtureRoot, "cli", "src", "index.ts"),
    [
      'import { Command } from "commander";',
      "const program = new Command();",
      `program.version("${version}");`,
      "",
    ].join("\n"),
  );
  writeFileSync(
    join(fixtureRoot, "skills", "remote-host", "skill.json"),
    JSON.stringify({ name: "remote-host", version }, null, 2) + "\n",
  );

  return fixtureRoot;
}

function runVersionBump(fixtureRoot: string, args: string[] = []) {
  return spawnSync("bash", [join(fixtureRoot, "scripts", "version-bump.sh"), ...args], {
    cwd: fixtureRoot,
    encoding: "utf8",
  });
}

function readTrimmedFile(fixtureRoot: string, relativePath: string) {
  return readFileSync(join(fixtureRoot, relativePath), "utf8").trim();
}

afterEach(() => {
  for (const tempRoot of tempRoots.splice(0)) {
    rmSync(tempRoot, { recursive: true, force: true });
  }
});

describe("version-bump script", () => {
  it("bumps patch by default and syncs managed files", () => {
    const fixtureRoot = createFixture("1.2.3");
    const result = runVersionBump(fixtureRoot);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("1.2.4");
    expect(result.stderr).toContain("Synced all manifests → 1.2.4");
    expect(readTrimmedFile(fixtureRoot, "VERSION")).toBe("1.2.4");
    expect(JSON.parse(readTrimmedFile(fixtureRoot, "cli/package.json"))).toMatchObject({
      version: "1.2.4",
    });
    expect(JSON.parse(readTrimmedFile(fixtureRoot, "skills/remote-host/skill.json"))).toMatchObject({
      version: "1.2.4",
    });
    expect(readTrimmedFile(fixtureRoot, "cli/src/index.ts")).toContain('program.version("1.2.4")');
  });

  it("bumps minor and resets patch", () => {
    const fixtureRoot = createFixture("1.2.3");
    const result = runVersionBump(fixtureRoot, ["--minor"]);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("1.3.0");
    expect(readTrimmedFile(fixtureRoot, "VERSION")).toBe("1.3.0");
  });

  it("bumps major and resets minor and patch", () => {
    const fixtureRoot = createFixture("1.2.3");
    const result = runVersionBump(fixtureRoot, ["--major"]);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("2.0.0");
    expect(readTrimmedFile(fixtureRoot, "VERSION")).toBe("2.0.0");
  });

  it("normalizes preview versions before bumping", () => {
    const fixtureRoot = createFixture("1.2.3-preview.4");
    const result = runVersionBump(fixtureRoot, ["--minor"]);

    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toBe("1.3.0");
    expect(readTrimmedFile(fixtureRoot, "VERSION")).toBe("1.3.0");
  });

  it("fails when more than one bump flag is provided", () => {
    const fixtureRoot = createFixture("1.2.3");
    const result = runVersionBump(fixtureRoot, ["--minor", "--major"]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Only one bump level flag may be set");
    expect(readTrimmedFile(fixtureRoot, "VERSION")).toBe("1.2.3");
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