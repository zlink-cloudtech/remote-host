# Design: `version:bump` for `remote-host`

## Summary

Add a new root-level script command, `pnpm version:bump`, to advance the
repository version using semantic versioning rules. The command defaults to a
patch bump and accepts `--minor` and `--major` to control which segment
advances. The command updates the root `VERSION` file, syncs all managed
manifests through the existing sync script, does not create a git commit, and
prints only the resulting version string on success.

## Context

The repository already uses the root `VERSION` file as the single source of
truth and has supporting scripts for preview releases and manifest consistency
checks:

- `scripts/version-preview.sh` increments preview suffixes and commits locally.
- `scripts/version-sync.sh` propagates the root version into package metadata.
- `scripts/check-versions.sh` verifies synchronized versions across managed files.

What is missing is a simple developer-facing command for bumping a formal
semver release without doing a local git commit.

## Goals

- Add `version:bump` as a root `package.json` script.
- Default to a patch bump when no flag is provided.
- Support `--minor` and `--major`.
- Reset lower-order semver fields when bumping a higher-order field.
- Accept both stable versions and existing preview versions as input.
- Reuse the existing manifest synchronization flow.
- Print only the new version on stdout so other scripts can consume it directly.

## Non-Goals

- Do not change the behavior of `version:preview`.
- Do not introduce automatic git add, commit, tag, or push steps.
- Do not add a new runtime dependency or semver library for this change.
- Do not redesign the broader release workflow.

## Considered Approaches

### Approach A: Add a dedicated `scripts/version-bump.sh` script

Create a new shell script alongside the existing version scripts and expose it via `package.json` as `version:bump`.

Why this is recommended:

- It matches the current repository pattern for version tooling.
- It keeps the scope narrow and isolated from the stable `version:preview` workflow.
- It reuses the existing `version-sync.sh` integration point.
- It is easy to document and validate with the current shell-based toolchain.

### Approach B: Refactor `version:preview` and `version:bump` onto a shared base script

Extract common parsing and file update logic into a shared helper and make both commands delegate to it.

Why it is not recommended now:

- It expands the change surface into an already-working preview flow.
- The immediate requirement is small and does not justify broader churn.
- It increases the amount of validation needed for unrelated behavior.

### Approach C: Implement the bump logic in Node or with a semver package

Use Node.js to parse and increment versions instead of shell logic.

Why it is not recommended now:

- The repository already uses shell scripts for version operations.
- It would introduce an implementation style mismatch for a small feature.
- The required behavior is simple enough to implement safely in bash.

## Recommended Design

### Command Surface

Add this root script:

```json
{
  "scripts": {
    "version:bump": "bash scripts/version-bump.sh"
  }
}
```

Supported invocations:

```bash
pnpm version:bump
pnpm version:bump --minor
pnpm version:bump --major
```

Flag rules:

- No flag means patch bump.
- `--minor` and `--major` are mutually exclusive.
- Passing more than one bump flag is an error.
- Passing any unknown flag is an error.

### Version Parsing Rules

The command reads the current value from the root `VERSION` file. Accepted input formats are:

- `x.y.z`
- `x.y.z-preview.n`

If the current version has a preview suffix, the suffix is discarded before the bump is calculated.

Examples:

| Current version   | Invocation                  | New version |
| ----------------- | --------------------------- | ----------- |
| `1.2.3`           | `pnpm version:bump`         | `1.2.4`     |
| `1.2.3`           | `pnpm version:bump --minor` | `1.3.0`     |
| `1.2.3`           | `pnpm version:bump --major` | `2.0.0`     |
| `1.2.3-preview.4` | `pnpm version:bump`         | `1.2.4`     |
| `1.2.3-preview.4` | `pnpm version:bump --minor` | `1.3.0`     |
| `1.2.3-preview.4` | `pnpm version:bump --major` | `2.0.0`     |

Reset rules:

- Patch bump: increment `patch` only.
- Minor bump: increment `minor`, then reset `patch` to `0`.
- Major bump: increment `major`, then reset `minor` and `patch` to `0`.

### Execution Flow

The new script should follow this sequence:

1. Resolve the repository root and locate the `VERSION` file.
2. Parse and validate arguments.
3. Read and validate the current version string.
4. Normalize preview input to the base semver value.
5. Compute the next version according to the selected bump level.
6. Write the new version back to `VERSION`.
7. Invoke `scripts/version-sync.sh`.
8. Print only the final version string to stdout.

### Output Behavior

On success, stdout must contain only the new version value, for example:

```text
1.3.0
```

This keeps the command composable in shell pipelines such as:

```bash
new_version="$(pnpm version:bump --minor)"
```

Human-readable status text is intentionally avoided on stdout. Error messages should go to stderr.

### Failure Handling

The command exits non-zero for the following cases:

- The `VERSION` file is missing.
- The version string is not valid semver in one of the accepted formats.
- More than one bump level flag is passed.
- An unsupported argument is passed.
- `scripts/version-sync.sh` fails.

The implementation should stay simple and explicit:

- Use `set -euo pipefail`.
- Do not call `git add`, `git commit`, or other release actions.
- Do not attempt a complex rollback if sync fails after `VERSION` has been updated.

The rationale for not adding rollback logic is that this is a local developer
utility, not a transactional release system. A visible failure is preferable to
hiding partial state changes behind bespoke recovery logic.

## Implementation Touchpoints

The expected implementation footprint is intentionally small:

- `package.json`: add the `version:bump` script.
- `scripts/version-bump.sh`: new command implementation.
- `docs/dev.md`: document the new workflow and flags.

No other command registration, shell completion, or runtime package changes are required.

## Validation and Acceptance Criteria

Minimum acceptance coverage:

- Stable patch bump: `1.2.3 -> 1.2.4`.
- Stable minor bump: `1.2.3 -> 1.3.0`.
- Stable major bump: `1.2.3 -> 2.0.0`.
- Preview patch bump: `1.2.3-preview.4 -> 1.2.4`.
- Preview minor bump: `1.2.3-preview.4 -> 1.3.0`.
- Preview major bump: `1.2.3-preview.4 -> 2.0.0`.
- After success, `VERSION`, `cli/package.json`, and `skills/remote-host/skill.json` contain the same version.
- Success output is only the new version string.
- Invalid argument combinations fail with a non-zero exit code.
- Invalid version input fails with a non-zero exit code.

Acceptance statement:

When a developer runs `pnpm version:bump`, `pnpm version:bump --minor`, or
`pnpm version:bump --major`, the repository version advances according to
semver rules, preview suffixes are normalized before the bump, synchronized
manifest files stay aligned with `VERSION`, no git commit is created, and the
command remains script-friendly.
