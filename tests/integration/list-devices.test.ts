import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { addDevice, readDevices } from "../../cli/src/lib/devices.js";

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "remote-host-list-devices-"));
  process.env["REMOTE_SSH_DEVICES_DIR"] = tempDir;
});

afterEach(() => {
  delete process.env["REMOTE_SSH_DEVICES_DIR"];
  rmSync(tempDir, { recursive: true, force: true });
});

describe("_list-devices output contract", () => {
  it("produces one device name per line for the completion command", () => {
    addDevice({ name: "server1", host: "1.1.1.1", username: "root" });
    addDevice({ name: "mypi", host: "2.2.2.2", username: "pi" });

    const output = readDevices()
      .map((d) => d.name)
      .join("\n");

    expect(output).toBe("server1\nmypi");
  });

  it("produces empty string when no devices exist", () => {
    const output = readDevices()
      .map((d) => d.name)
      .join("\n");

    expect(output).toBe("");
  });

  it("includes all added device names in output", () => {
    addDevice({ name: "alpha", host: "10.0.0.1", username: "admin" });
    addDevice({ name: "beta", host: "10.0.0.2", username: "admin" });
    addDevice({ name: "gamma", host: "10.0.0.3", username: "admin" });

    const names = readDevices().map((d) => d.name);

    expect(names).toContain("alpha");
    expect(names).toContain("beta");
    expect(names).toContain("gamma");
    expect(names).toHaveLength(3);
  });
});
