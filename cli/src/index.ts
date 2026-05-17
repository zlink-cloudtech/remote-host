import { Command } from "commander";
import { readConfig } from "./lib/config-file.js";
import { registerConfig } from "./commands/config.js";
import { registerCompletion } from "./commands/completion.js";
import { registerDevice } from "./commands/device.js";
import { registerSsh } from "./commands/ssh.js";
import { registerUpload } from "./commands/upload.js";
import { registerDownload } from "./commands/download.js";

// Inject env vars from ~/.remotehostrc.json into process.env BEFORE any command
// action runs. Shell/system env always takes priority over config-file env.
// Without this early call, `env` entries in the rc file would have no effect.
await readConfig();

const program = new Command();

program
  .name("remote-host")
  .description("SSH/SCP tool for managing remote devices")
  .version("0.1.0");

registerConfig(program);
registerCompletion(program);
registerDevice(program);
registerSsh(program);
registerUpload(program);
registerDownload(program);

await program.parseAsync(process.argv);
