import type { Command } from "commander";
import { input, password, confirm, select } from "@inquirer/prompts";
import chalk from "chalk";
import {
  readDevices,
  addDevice,
  removeDevice,
  updateDevice,
  maskPassword,
} from "../lib/devices.js";
import type { Device } from "../types/device.js";

/** Detect @inquirer prompt cancellation (Ctrl+C) across multiple @inquirer/core versions. */
function isPromptCancel(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.constructor.name === "ExitPromptError" || err.constructor.name === "CancelPromptError")
  );
}

function formatDeviceTable(devices: Device[], showPassword: boolean): string {
  if (devices.length === 0) {
    return chalk.yellow("No devices configured.");
  }

  const header = [
    chalk.bold("ID"),
    chalk.bold("Name"),
    chalk.bold("Host"),
    chalk.bold("Port"),
    chalk.bold("Username"),
    chalk.bold("Password"),
    chalk.bold("Key File"),
  ];

  const rows = devices.map((d) => [
    d.id,
    d.name,
    d.host,
    String(d.port ?? 22),
    d.username,
    d.password ? (showPassword ? d.password : maskPassword(d.password)) : chalk.dim("-"),
    d.keyFile ?? chalk.dim("-"),
  ]);

  const cols = header.length;
  const widths: number[] = Array.from({ length: cols }, (_, i) =>
    Math.max(
      // strip ANSI escape codes to get true display width
      // eslint-disable-next-line no-control-regex
      header[i].replace(/\x1B\[[0-9;]*m/g, "").length,
      // eslint-disable-next-line no-control-regex
      ...rows.map((r) => r[i].replace(/\x1B\[[0-9;]*m/g, "").length),
    ),
  );

  const sep = widths.map((w) => "-".repeat(w + 2)).join("+");
  const fmt = (row: string[]) => row.map((cell, i) => ` ${cell.padEnd(widths[i])} `).join("|");

  return [fmt(header), sep, ...rows.map(fmt)].join("\n");
}

export function registerDevice(program: Command): void {
  const device = program.command("device").description("Manage remote devices");

  // ── device list ──────────────────────────────────────────────────────────
  device
    .command("list")
    .description("List all configured devices")
    .option("--show-password", "Display plaintext passwords", false)
    .action((opts: { showPassword: boolean }) => {
      const devices = readDevices();
      process.stdout.write(formatDeviceTable(devices, opts.showPassword) + "\n");
    });

  // ── device add ───────────────────────────────────────────────────────────
  device
    .command("add")
    .description("Add a new device (interactive if options are omitted)")
    .option("-n, --name <name>", "Device name")
    .option("-H, --host <host>", "Hostname or IP address")
    .option("-P, --port <port>", "SSH port", "22")
    .option("-u, --username <username>", "SSH username")
    .option("-p, --password <pwd>", "SSH password")
    .option("-k, --key-file <path>", "Path to SSH private key file")
    .action(
      async (opts: {
        name?: string;
        host?: string;
        port?: string;
        username?: string;
        password?: string;
        keyFile?: string;
      }) => {
        try {
          const name =
            opts.name ??
            (await input({
              message: "Device name:",
              validate: (v) => v.trim() !== "" || "Required",
            }));
          const host =
            opts.host ??
            (await input({
              message: "Host (IP or hostname):",
              validate: (v) => v.trim() !== "" || "Required",
            }));
          const portStr = opts.port ?? (await input({ message: "SSH port:", default: "22" }));
          const port = parseInt(portStr, 10);
          const username =
            opts.username ??
            (await input({ message: "Username:", validate: (v) => v.trim() !== "" || "Required" }));

          let authPassword: string | undefined;
          let keyFile: string | undefined;

          if (opts.password !== undefined) {
            authPassword = opts.password;
          } else if (opts.keyFile !== undefined) {
            keyFile = opts.keyFile;
          } else {
            const authMethod = await select({
              message: "Authentication method:",
              choices: [
                { name: "Password", value: "password" },
                { name: "SSH key file", value: "key" },
                { name: "None (key-based auth without explicit keyFile)", value: "none" },
              ],
            });
            if (authMethod === "password") {
              authPassword = await password({ message: "Password:" });
            } else if (authMethod === "key") {
              keyFile = await input({ message: "Path to private key file:" });
            }
          }

          const dev = addDevice({
            name: name.trim(),
            host: host.trim(),
            port,
            username: username.trim(),
            ...(authPassword !== undefined && { password: authPassword }),
            ...(keyFile !== undefined && { keyFile: keyFile.trim() }),
          });

          process.stdout.write(chalk.green(`✓ Device '${dev.name}' added (id: ${dev.id})\n`));
        } catch (err) {
          if (isPromptCancel(err)) return;
          throw err;
        }
      },
    );

  // ── device remove ────────────────────────────────────────────────────────
  device
    .command("remove <id-or-name>")
    .description("Remove a device by id or name")
    .action(async (idOrName: string) => {
      try {
        const ok = await confirm({
          message: `Remove device '${idOrName}'?`,
          default: false,
        });
        if (!ok) {
          process.stdout.write("Aborted.\n");
          return;
        }
        if (!removeDevice(idOrName)) {
          process.stderr.write(`Device not found: ${idOrName}\n`);
          process.exitCode = 1;
          return;
        }
        process.stdout.write(chalk.green(`✓ Device '${idOrName}' removed.\n`));
      } catch (err) {
        if (isPromptCancel(err)) return;
        throw err;
      }
    });

  // ── device update ────────────────────────────────────────────────────────
  device
    .command("update <id-or-name>")
    .description("Update a device by id or name")
    .option("-n, --name <name>", "New device name")
    .option("-H, --host <host>", "New hostname or IP")
    .option("-P, --port <port>", "New SSH port")
    .option("-u, --username <username>", "New SSH username")
    .option("-p, --password <pwd>", "New SSH password")
    .option("-k, --key-file <path>", "New SSH private key file path")
    .option("--clear-password", "Remove stored password")
    .option("--clear-key-file", "Remove stored key file path")
    .action(
      (
        idOrName: string,
        opts: {
          name?: string;
          host?: string;
          port?: string;
          username?: string;
          password?: string;
          keyFile?: string;
          clearPassword?: boolean;
          clearKeyFile?: boolean;
        },
      ) => {
        const patch: Record<string, string | number | undefined> = {};
        if (opts.name) patch["name"] = opts.name;
        if (opts.host) patch["host"] = opts.host;
        if (opts.port) patch["port"] = parseInt(opts.port, 10);
        if (opts.username) patch["username"] = opts.username;
        if (opts.password) patch["password"] = opts.password;
        if (opts.keyFile) patch["keyFile"] = opts.keyFile;
        if (opts.clearPassword) patch["password"] = undefined;
        if (opts.clearKeyFile) patch["keyFile"] = undefined;

        if (Object.keys(patch).length === 0) {
          process.stderr.write("No update fields specified. Use --help for options.\n");
          process.exitCode = 1;
          return;
        }

        const updated = updateDevice(idOrName, patch);
        if (!updated) {
          process.stderr.write(`Device not found: ${idOrName}\n`);
          process.exitCode = 1;
          return;
        }
        process.stdout.write(chalk.green(`✓ Device '${updated.name}' updated.\n`));
      },
    );
}
