#!/usr/bin/env node
// Entry point — CJS-compatible shebang wrapper.
// Delegates to the compiled ESM index.
import("../dist/index.js");
