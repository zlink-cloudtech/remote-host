import type { Command } from "commander";
import { spawnSync } from "node:child_process";
import { findDevice } from "../lib/devices.js";

export function registerExec(program: Command): void {
  program
    .command("exec")
    .description("Execute a command on a named device via SSH")
    .requiredOption("-d, --device <device>", "Device name or id")
    .allowUnknownOption()
    .argument("[args...]", "Command and arguments to run on the remote device")
    .action((args: string[], options: { device: string }) => {
      if (args.length === 0) {
        process.stderr.write("No command specified\n");
        process.exitCode = 1;
        return;
      }

      const device = findDevice(options.device);
      if (!device) {
        process.stderr.write(`Device not found: ${options.device}\n`);
        process.exitCode = 1;
        return;
      }

      const port = device.port ?? 22;
      const target = `${device.username}@${device.host}`;
      const remoteCmd = args.join(" ");

      let cmd: string;
      let sshArgs: string[];

      if (device.password) {
        cmd = "sshpass";
        sshArgs = [
          "-p",
          device.password,
          "ssh",
          "-o",
          "StrictHostKeyChecking=accept-new",
          "-p",
          String(port),
          target,
          remoteCmd,
        ];
      } else {
        cmd = "ssh";
        sshArgs = ["-p", String(port)];
        if (device.keyFile) sshArgs.push("-i", device.keyFile);
        sshArgs.push(target, remoteCmd);
      }

      const result = spawnSync(cmd, sshArgs, { stdio: "inherit" });
      if (result.error) {
        process.stderr.write(`Failed to run ${cmd}: ${result.error.message}\n`);
        process.exitCode = 1;
        return;
      }
      if (result.status !== null && result.status !== 0) {
        process.exitCode = result.status;
      }
    });
}
