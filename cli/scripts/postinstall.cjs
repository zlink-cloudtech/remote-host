"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");

/**
 * Writes the bundled default config to configPath with mode 600,
 * but only if the file does not already exist (idempotent).
 */
function applyDefaults(configPath, defaultConfigPath) {
  if (fs.existsSync(configPath)) return; // already exists — skip

  try {
    const content = fs.readFileSync(defaultConfigPath, "utf8");
    fs.writeFileSync(configPath, content, { mode: 0o600 });
  } catch (err) {
    console.warn("[remote-host] postinstall: could not write default config:", err.message);
  }
}

/**
 * On Linux/macOS, appends a bash completion loader line to ~/.bashrc so that
 * tab-completion is active in every new shell session. Idempotent: skips if
 * the file already contains a remote-host completion entry.
 *
 * @param {string} [homedir]   - override home directory (used in tests)
 * @param {string} [platform]  - override process.platform (used in tests)
 */
function applyBashCompletion(homedir, platform) {
  const _platform = platform ?? process.platform;
  if (_platform === "win32") return;

  const home = homedir ?? os.homedir();
  const TOOL = "remote-host";
  const marker = `${TOOL} completion bash`;
  const loaderLine =
    `\n# ${TOOL} shell completion (added by postinstall)\n` +
    `if command -v ${TOOL} &>/dev/null; then eval "$(${TOOL} completion bash)"; fi\n`;

  const bashrc = path.join(home, ".bashrc");

  try {
    try {
      const existing = fs.readFileSync(bashrc, "utf8");
      if (existing.includes(marker)) return; // already registered — idempotent
    } catch {
      // file doesn't exist yet — continue to create it
    }

    fs.appendFileSync(bashrc, loaderLine);
    console.log(`[${TOOL}] bash completion registered: ${bashrc}`);
  } catch (err) {
    console.warn(`[${TOOL}] postinstall: could not register bash completion:`, err.message);
  }
}

try {
  const configPath = path.join(os.homedir(), ".remotehostrc.json");
  const defaultConfigPath = path.resolve(__dirname, "..", "remotehostrc.default.json");
  applyDefaults(configPath, defaultConfigPath);
  applyBashCompletion();
} catch (err) {
  console.warn("[remote-host] postinstall:", err.message);
}

module.exports = { applyDefaults, applyBashCompletion };
