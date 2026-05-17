import type { Command } from "commander";
import { spawnSync } from "node:child_process";
import { findDevice } from "../lib/devices.js";

export function registerSsh(program: Command): void {
  program
    .command("ssh <device>")
    .description("Open an SSH session to a named device")
    .action((deviceRef: string) => {
      const device = findDevice(deviceRef);
      if (!device) {
        process.stderr.write(`Device not found: ${deviceRef}\n`);
        process.exitCode = 1;
        return;
      }

      const port = device.port ?? 22;
      const target = `${device.username}@${device.host}`;

      let cmd: string;
      let args: string[];

      if (device.password) {
        cmd = "sshpass";
        // sshpass cannot forward the SSH host-key confirmation prompt to the
        // terminal — it silently exits (code 6) when the host is unknown.
        // Accept-new automatically stores new keys while still rejecting
        // changed keys, which prevents silent failures on first connection.
        args = [
          "-p",
          device.password,
          "ssh",
          "-o",
          "StrictHostKeyChecking=accept-new",
          "-p",
          String(port),
          target,
        ];
      } else {
        cmd = "ssh";
        args = ["-p", String(port)];
        if (device.keyFile) args.push("-i", device.keyFile);
        args.push(target);
      }

      const result = spawnSync(cmd, args, { stdio: "inherit" });
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
