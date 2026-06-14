import { createRequire } from "module";
import { Command } from "commander";
import { readConfig } from "./lib/config-file.js";
import { registerConfig } from "./commands/config.js";
import { registerCompletion } from "./commands/completion.js";
import { registerListDevices } from "./commands/_list-devices.js";
import { registerDevice } from "./commands/device.js";
import { registerSsh } from "./commands/ssh.js";
import { registerExec } from "./commands/exec.js";
import { registerUpload } from "./commands/upload.js";
import { registerDownload } from "./commands/download.js";

const _require = createRequire(import.meta.url);
const { version } = _require("../package.json") as { version: string };

// Inject env vars from ~/.remotehostrc.json into process.env BEFORE any command
// action runs. Shell/system env always takes priority over config-file env.
// Without this early call, `env` entries in the rc file would have no effect.
await readConfig();

const program = new Command();

program
  .name("remote-host")
  .description("SSH/SCP tool for managing remote devices")
  .version(version);

registerConfig(program);
registerCompletion(program);
registerListDevices(program);
registerDevice(program);
registerSsh(program);
registerExec(program);
registerUpload(program);
registerDownload(program);

await program.parseAsync(process.argv);
