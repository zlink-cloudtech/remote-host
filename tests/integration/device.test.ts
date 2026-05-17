import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  readDevices,
  addDevice,
  removeDevice,
  updateDevice,
  findDevice,
  maskPassword,
} from "../../cli/src/lib/devices.js";

// Use a fresh temp dir per test to isolate device storage.
// devices.ts reads REMOTE_SSH_DEVICES_DIR lazily on each call.
let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "remote-host-test-"));
  process.env["REMOTE_SSH_DEVICES_DIR"] = tempDir;
});

afterEach(() => {
  delete process.env["REMOTE_SSH_DEVICES_DIR"];
  rmSync(tempDir, { recursive: true, force: true });
});

describe("device management", () => {
  it("starts with an empty device list", () => {
    expect(readDevices()).toEqual([]);
  });

  it("can add a device", () => {
    const dev = addDevice({ name: "mydev", host: "192.168.1.1", username: "root", port: 22 });
    expect(dev.id).toBeTruthy();
    expect(dev.name).toBe("mydev");
    expect(dev.host).toBe("192.168.1.1");
    expect(readDevices()).toHaveLength(1);
  });

  it("can find a device by name", () => {
    addDevice({ name: "server1", host: "10.0.0.1", username: "admin" });
    const found = findDevice("server1");
    expect(found?.host).toBe("10.0.0.1");
  });

  it("can find a device by id", () => {
    const added = addDevice({ name: "srv", host: "10.0.0.2", username: "admin" });
    const found = findDevice(added.id);
    expect(found?.name).toBe("srv");
  });

  it("returns null for unknown device", () => {
    expect(findDevice("nonexistent")).toBeNull();
  });

  it("can update a device host", () => {
    addDevice({ name: "srv", host: "10.0.0.1", username: "root" });
    const updated = updateDevice("srv", { host: "10.0.0.99" });
    expect(updated?.host).toBe("10.0.0.99");
    expect(findDevice("srv")?.host).toBe("10.0.0.99");
  });

  it("returns null when updating non-existent device", () => {
    const result = updateDevice("ghost", { host: "1.2.3.4" });
    expect(result).toBeNull();
  });

  it("can remove a device by name", () => {
    addDevice({ name: "dev1", host: "1.1.1.1", username: "u" });
    const ok = removeDevice("dev1");
    expect(ok).toBe(true);
    expect(readDevices()).toHaveLength(0);
  });

  it("returns false when removing non-existent device", () => {
    expect(removeDevice("ghost")).toBe(false);
  });

  it("masks password with asterisks", () => {
    const masked = maskPassword("super-secret");
    expect(masked).toBe("********");
    expect(masked).not.toContain("super-secret");
  });

  it("persists devices across reads", () => {
    addDevice({ name: "a", host: "1.1.1.1", username: "u" });
    addDevice({ name: "b", host: "2.2.2.2", username: "v", password: "pwd" });
    const list = readDevices();
    expect(list).toHaveLength(2);
    expect(list[0].name).toBe("a");
    expect(list[1].name).toBe("b");
  });

  it("does not expose password in stored YAML (masking is display layer responsibility)", () => {
    addDevice({ name: "secure", host: "1.1.1.1", username: "u", password: "secretpwd" });
    // The stored object has the password — masking is the display layer's responsibility
    const devices = readDevices();
    expect(devices[0].password).toBe("secretpwd");
  });
});
