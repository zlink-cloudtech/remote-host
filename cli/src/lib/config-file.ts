import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export interface CliConfig {
  token?: string;
  env?: Record<string, string>; // env vars to inject on startup (without overriding existing)
}

const RC_PATH = join(homedir(), ".remotehostrc.json");

const DEFAULTS: Required<CliConfig> = {
  token: "",
  env: {},
};

export function readConfig(): Required<CliConfig> {
  let fileConfig: Partial<CliConfig> = {};
  if (existsSync(RC_PATH)) {
    try {
      fileConfig = JSON.parse(readFileSync(RC_PATH, "utf8")) as Partial<CliConfig>;
    } catch {
      // ignore corrupt file
    }
  }

  // Inject env vars defined in rc file without overriding existing env
  if (fileConfig.env) {
    for (const [k, v] of Object.entries(fileConfig.env)) {
      if (!process.env[k]) process.env[k] = v;
    }
  }

  return {
    token: process.env.REMOTE_HOST_TOKEN ?? fileConfig.token ?? DEFAULTS.token,
    env: fileConfig.env ?? DEFAULTS.env,
  };
}

export function writeConfig(patch: Partial<CliConfig>): void {
  let existing: Partial<CliConfig> = {};
  if (existsSync(RC_PATH)) {
    try {
      existing = JSON.parse(readFileSync(RC_PATH, "utf8")) as Partial<CliConfig>;
    } catch {
      // ignore
    }
  }
  const merged = { ...existing, ...patch };
  writeFileSync(RC_PATH, JSON.stringify(merged, null, 2) + "\n", { mode: 0o600 });
}
