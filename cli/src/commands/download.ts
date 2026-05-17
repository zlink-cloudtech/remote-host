import type { Command } from "commander";
import { spawnSync } from "node:child_process";
import { findDevice } from "../lib/devices.js";

export function registerDownload(program: Command): void {
  program
    .command("download <device> <remote-path> <local-path>")
    .description("Download a file/directory from a remote device via scp")
    .option("-r, --recursive", "Recursively copy directories", false)
    .action(
      (deviceRef: string, remotePath: string, localPath: string, opts: { recursive: boolean }) => {
        const device = findDevice(deviceRef);
        if (!device) {
          process.stderr.write(`Device not found: ${deviceRef}\n`);
          process.exitCode = 1;
          return;
        }

        const port = device.port ?? 22;
        const source = `${device.username}@${device.host}:${remotePath}`;

        let cmd: string;
        let args: string[];

        if (device.password) {
          cmd = "sshpass";
          args = [
            "-p",
            device.password,
            "scp",
            "-o",
            "StrictHostKeyChecking=accept-new",
            "-P",
            String(port),
          ];
          if (opts.recursive) args.push("-r");
          args.push(source, localPath);
        } else {
          cmd = "scp";
          args = ["-P", String(port)];
          if (device.keyFile) args.push("-i", device.keyFile);
          if (opts.recursive) args.push("-r");
          args.push(source, localPath);
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
      },
    );
}
