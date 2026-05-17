import type { Command } from "commander";
import { readConfig, writeConfig } from "../lib/config-file.js";

export function registerConfig(program: Command): void {
  const config = program.command("config").description("Manage CLI configuration");

  config
    .command("show")
    .description("Display current configuration")
    .action(async () => {
      const cfg = await readConfig();
      process.stdout.write(JSON.stringify(cfg, null, 2) + "\n");
    });

  config
    .command("set-token <token>")
    .description("Save auth token")
    .action(async (token: string) => {
      writeConfig({ token });
      process.stdout.write("Token saved.\n");
    });
}
