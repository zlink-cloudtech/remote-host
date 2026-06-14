# Development Guide — remote-host

**Last Updated**: 2026-05-13

---

## Prerequisites

- Node.js ≥ 20.0.0
- pnpm ≥ 9.0.0

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

# Clean build artifacts
pnpm clean

# Run CLI from source
cd cli && npx tsx src/index.ts <command>
```

## Project Structure

```
remote-host/
├── VERSION                # Single source of truth for version
├── package.json           # Root scripts (build, test, lint, clean)
├── cli/                   # CLI package
│   ├── bin/               # Shebang entry point
│   └── src/
│       ├── commands/      # One file per subcommand
│       ├── lib/           # Shared utils (no Commander deps)
│       └── types/         # Type definitions + parsers
├── tests/                 # Integration tests (Vitest)
├── scripts/               # Build & release scripts
└── docs/                  # Documentation
```

## Adding a New Command

1. Create `cli/src/commands/<name>.ts` with a `register<Name>(program)` export
2. Import and call `register<Name>(program)` in `cli/src/index.ts`
3. Add integration test in `tests/integration/<name>.test.ts`
4. Update `docs/quickstart.md` if it changes basic usage

## Testing

Tests live in `tests/integration/`. One test file per user story.

```bash
# Run all tests
pnpm test

# Run a specific test file
cd tests && npx vitest run integration/<name>.test.ts
```

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
