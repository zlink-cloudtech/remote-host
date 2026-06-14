import { Command as Cmd } from "commander";
import { readDevices } from "../lib/devices.js";

export function registerListDevices(program: Cmd): void {
  const cmd = new Cmd("_list-devices")
    .description("Internal: list device names for shell completion")
    .action(() => {
      const devices = readDevices();
      if (devices.length > 0) {
        process.stdout.write(devices.map((d) => d.name).join("\n") + "\n");
      }
    });
  program.addCommand(cmd, { hidden: true });
}
